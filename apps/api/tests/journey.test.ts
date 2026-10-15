import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serve } from "@hono/node-server";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  decodeFunctionData,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  http,
  isHex,
  keccak256,
  toHex,
  type Hex,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { z } from "zod";
import { demoTokenAbi, spokeProtocolAbi } from "@spoke/protocol";
import { createLiveClient } from "../../web/src/lib/client/live/index.js";
import { createApp } from "../src/app.js";
import { createChainService } from "../src/services/chain.js";
import { createIndexer } from "../src/services/indexer.js";
import { exerciseInvitations } from "./invitation-journey.js";
import { isolatedStore } from "./isolated-store.js";

const rpcUrl = process.env.JOURNEY_RPC_URL;
const databaseUrl = process.env.JOURNEY_DATABASE_URL;
const origin = "http://localhost:3140";
const hex = (value: string) => z.custom<Hex>(isHex).parse(value);
const mnemonic = "test test test test test test test test test test test junk";
const bytecode = async (name: string) =>
  hex(
    z
      .object({ bytecode: z.object({ object: z.string() }) })
      .parse(
        JSON.parse(
          await readFile(
            new URL(`../../../packages/contracts/out/${name}.sol/${name}.json`, import.meta.url),
            "utf8",
          ),
        ),
      ).bytecode.object,
  );

describe.skipIf(!rpcUrl || !databaseUrl)(
  "live frontend client to real API and settlement journey",
  () => {
    const transport = http(rpcUrl ?? "http://127.0.0.1:19546", { retryCount: 0 });
    const chainClient = createPublicClient({ chain: foundry, transport, cacheTime: 0 });
    const miner = createTestClient({ chain: foundry, mode: "anvil", transport });
    const wallet = (index: number) =>
      createWalletClient({
        chain: foundry,
        transport,
        account: mnemonicToAccount(mnemonic, { addressIndex: index }),
      });
    const merchant = wallet(0);
    const distributor = wallet(1);
    const buyer = wallet(2);
    const refundedBuyer = wallet(3);
    let database: Awaited<ReturnType<typeof isolatedStore>> | undefined;
    let server: ReturnType<typeof serve> | undefined;
    let indexer: ReturnType<typeof createIndexer> | undefined;
    let apiUrl = "";
    let token: Hex;
    let protocol: Hex;
    let requests = 0;
    const send = async (actor: ReturnType<typeof wallet>, data: Hex, to = protocol) => {
      const hash = await actor.sendTransaction({ to, data });
      const receipt = await chainClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");
      return hash;
    };
    const protocolData = (
      functionName:
        | "activateCampaign"
        | "pauseCampaign"
        | "resumeCampaign"
        | "refundUnusedRewardBudget"
        | "claimMerchantProceeds",
      id = 1n,
    ) => encodeFunctionData({ abi: spokeProtocolAbi, functionName, args: [id] });
    const sync = async () => {
      await miner.mine({ blocks: 2 });
      if (!indexer) throw new Error("Journey indexer is unavailable");
      expect((await indexer.tick()).status).toBe("indexed");
    };
    const session = async (actor: ReturnType<typeof wallet>) => {
      let cookie = "";
      let csrf = "";
      const fetcher: typeof fetch = async (input, init) => {
        const request = new Request(input, init);
        const headers = new Headers(request.headers);
        headers.set("origin", origin);
        if (cookie) headers.set("cookie", cookie);
        if (csrf) headers.set("x-csrf-token", csrf);
        requests++;
        const response = await fetch(new Request(request, { headers }));
        cookie = response.headers.get("set-cookie")?.split(";")[0] ?? cookie;
        if (new URL(request.url).pathname.endsWith("/auth/verify") && response.ok)
          csrf = z
            .object({ data: z.object({ csrfToken: z.string() }) })
            .parse(await response.clone().json()).data.csrfToken;
        return response;
      };
      const client = createLiveClient({ apiUrl, fetcher });
      const challenge = await client.call("auth.challenge", {
        address: actor.account.address,
        chainId: 31337,
      });
      await client.call("auth.verify", {
        message: challenge.message,
        signature: await actor.signMessage({ message: challenge.message }),
        method: "wallet",
      });
      return client;
    };
    beforeAll(async () => {
      if (!databaseUrl?.endsWith("/spoke_journey"))
        throw new Error("Use the dedicated spoke_journey database");
      expect(await chainClient.getChainId()).toBe(31337);
      database = await isolatedStore(databaseUrl, `journey_${randomUUID().replaceAll("-", "")}`);
      const tokenReceipt = await chainClient.waitForTransactionReceipt({
        hash: await merchant.deployContract({
          abi: demoTokenAbi,
          bytecode: await bytecode("SpokeDemoUSD"),
        }),
      });
      if (!tokenReceipt.contractAddress)
        throw new Error("Demo token deployment did not create an address");
      token = tokenReceipt.contractAddress;
      const protocolReceipt = await chainClient.waitForTransactionReceipt({
        hash: await merchant.deployContract({
          abi: spokeProtocolAbi,
          bytecode: await bytecode("SpokeProtocol"),
          args: [getAddress(token)],
        }),
      });
      if (!protocolReceipt.contractAddress)
        throw new Error("Protocol deployment did not create an address");
      protocol = protocolReceipt.contractAddress;
      const chain = createChainService(rpcUrl ?? "", 31337, protocol, token);
      const services = {
        store: database.store,
        chain,
        webOrigin: origin,
        production: false,
        operators: [merchant.account.address.toLowerCase()],
        apiOrigin: "",
      };
      const app = createApp({
        webOrigin: origin,
        probes: { rpc: () => Promise.resolve("ok") },
        config: { chainId: 31337, protocolAddress: protocol },
        services,
      });
      await new Promise<void>((resolve) => {
        server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, (info) => {
          apiUrl = `http://127.0.0.1:${String(info.port)}`;
          services.apiOrigin = apiUrl;
          resolve();
        });
      });
      indexer = createIndexer(database.store, chain, protocolReceipt.blockNumber, {
        source: "direct_rpc",
        pollIntervalMs: 60_000,
      });
    }, 30_000);
    afterAll(async () => {
      indexer?.stop();
      if (server) {
        const listener = server;
        await new Promise<void>((resolve, reject) => {
          listener.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
      if (database) await database.close();
    });
    it("launches, buys, delivers, refunds, finalizes, claims and reconciles canonical balances", async () => {
      if (!database) throw new Error("Journey database is unavailable");
      const seller = await session(merchant);
      const earner = await session(distributor);
      const customer = await session(buyer);
      const refundCustomer = await session(refundedBuyer);
      await seller.call("merchants.setup", {
        name: "Journey Merchant",
        slug: `journey_${randomUUID().slice(0, 8)}`,
        supportEmail: "journey@example.com",
        region: "NG",
        agreementVersion: "1.0",
      });
      const product = await seller.call("products.save", {
        id: randomUUID(),
        product: {
          title: "Journey product",
          summary: "Confirmed delivery journey",
          description: "A paid manual fulfillment product for the local settlement journey.",
          category: "digital",
          priceBaseUnits: "100000000",
          token,
          fulfillmentMode: "manual",
          deliverable: "Private delivery instructions for the paying buyer.",
          refundPolicy: "The merchant may refund before the sixty second hold expires.",
        },
      });
      const expiry = (await chainClient.getBlock()).timestamp + 86_400n;
      const draftId = randomUUID();
      const draft = await seller.call("campaigns.saveDraft", {
        id: draftId,
        draft: {
          mode: "create",
          productId: product.id,
          productVersion: product.version,
          policy: {
            rewardToken: token,
            commissionBps: 1000,
            perSaleCap: "10000000",
            campaignLiabilityCap: "100000000",
            maxRewardedAncestors: 1,
            weightsBps: [10000],
            shortPathMode: "RENORMALIZE_EXISTING",
            holdSeconds: 60,
            expiry: expiry.toString(),
            eligibilityHash: toHex(0n, { size: 32 }),
          },
          endsAt: new Date(Number(expiry) * 1000).toISOString(),
          stepReached: 5,
          version: 0,
        },
      });
      expect(draft.version).toBe(1);
      const prepared = await seller.call("campaigns.prepareCreate", { id: draftId });
      if (!prepared.config)
        throw new Error("Prepared campaign is missing its exact SKU configuration");
      const terms = {
        ...prepared.policy,
        rewardToken: getAddress(prepared.policy.rewardToken),
        eligibilityHash: hex(prepared.policy.eligibilityHash),
        perSaleCap: BigInt(prepared.policy.perSaleCap),
        campaignLiabilityCap: BigInt(prepared.policy.campaignLiabilityCap),
        holdSeconds: BigInt(prepared.policy.holdSeconds),
        expiry: BigInt(prepared.policy.expiry),
        shortPathMode: prepared.policy.shortPathMode === "RENORMALIZE_EXISTING" ? 0 : 1,
      };
      await send(
        merchant,
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "createCampaign",
          args: [
            hex(prepared.metadataHash),
            { skuHash: hex(prepared.config.skuHash), skuPrice: BigInt(prepared.config.skuPrice) },
            terms,
          ],
        }),
      );
      await send(
        merchant,
        encodeFunctionData({ abi: demoTokenAbi, functionName: "faucet", args: [500000000n] }),
        token,
      );
      await send(
        merchant,
        encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [getAddress(protocol), 100000000n],
        }),
        token,
      );
      await send(
        merchant,
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "fundCampaign",
          args: [1n, 100000000n],
        }),
      );
      await send(merchant, protocolData("activateCampaign"));
      await sync();
      const invitationId = await exerciseInvitations({
        seller,
        earner,
        outsider: refundCustomer,
        recipient: distributor.account.address,
        merchant: merchant.account.address,
        store: database.store,
        pause: () => send(merchant, protocolData("pauseCampaign")),
        resume: () => send(merchant, protocolData("resumeCampaign")),
      });
      await send(
        distributor,
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "createNode",
          args: [1n, 0n, keccak256(toHex("Journey distributor"))],
        }),
      );
      await sync();
      expect((await earner.call("invitations.get", { id: invitationId })).joinedNodeId).toBe("1");
      expect(
        (await seller.call("invitations.sent", {})).items.find((item) => item.id === invitationId)
          ?.joinedNodeId,
      ).toBe("1");
      expect(
        (await seller.call("campaigns.distributors", { campaignId: "1" })).items[0]
          ?.invitationStatus,
      ).toBe("accepted");
      const campaign = await seller.call("campaigns.get", { campaignId: "1" });
      expect(campaign.product.title).toBe(product.title);
      await expect(seller.call("campaigns.deleteDraft", { id: draftId })).rejects.toMatchObject({
        code: "CONFLICT",
      });
      expect((await earner.call("links.mine", {})).items).toHaveLength(1);
      const purchase = async (actor: ReturnType<typeof wallet>, client: typeof customer) => {
        await send(
          actor,
          encodeFunctionData({ abi: demoTokenAbi, functionName: "faucet", args: [100000000n] }),
          token,
        );
        const preview = await client.call("checkout.preview", {
          campaignId: "1",
          node: "1",
          buyer: actor.account.address,
        });
        expect(preview.rewardTotal).toBe("10000000");
        const orderKey = keccak256(toHex(randomUUID()));
        const intent = await client.call("checkout.createIntent", {
          campaignId: "1",
          nodeId: "1",
          orderKey,
          policyHash: preview.policyHash,
          expectedPrice: preview.price,
          expectedReward: preview.rewardTotal,
          chainId: 31337,
        });
        expect(decodeFunctionData({ abi: spokeProtocolAbi, data: hex(intent.data) })).toEqual({
          functionName: "purchase",
          args: [1n, 1n, orderKey],
        });
        expect(
          (
            await client.call("checkout.createIntent", {
              campaignId: "1",
              nodeId: "1",
              orderKey,
              policyHash: preview.policyHash,
              expectedPrice: preview.price,
              expectedReward: preview.rewardTotal,
              chainId: 31337,
            })
          ).id,
        ).toBe(intent.id);
        await send(
          actor,
          encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [getAddress(protocol), BigInt(intent.expectedPrice)],
          }),
          token,
        );
        const transaction = await send(actor, hex(intent.data), hex(intent.to));
        const submitted = await client.call("checkout.attachTransaction", {
          id: intent.id,
          txHash: transaction,
        });
        const saleId = await chainClient.readContract({
          address: getAddress(protocol),
          abi: spokeProtocolAbi,
          functionName: "saleIdForOrder",
          args: [1n, orderKey],
        });
        expect(submitted.txHash).toBe(transaction);
        const grant = await client.call("fulfillment.access", { saleId: saleId.toString() });
        const item = grant.items[0];
        if (!item) throw new Error("Paid delivery did not create an access URL");
        const delivered = await fetch(item.url);
        expect(delivered.status).toBe(200);
        expect(await delivered.text()).toContain("Private delivery instructions");
        return { saleId: saleId.toString(), intentId: intent.id, url: item.url, transaction };
      };
      const paid = await purchase(buyer, customer);
      expect((await database.store.list("receipt")).items).toEqual([]);
      const refund = await purchase(refundedBuyer, refundCustomer);
      await sync();
      expect((await customer.call("checkout.getIntent", { id: paid.intentId })).status).toBe(
        "confirmed",
      );
      const reserved = await customer.call("receipts.get", { saleId: paid.saleId, chainId: 31337 });
      expect(reserved.purchaseTx.hash).toBe(paid.transaction);
      expect(reserved.allocations).toHaveLength(1);
      expect((await earner.call("earnings.summary", {})).tokens[0]?.atRisk).toBe("20000000");
      expect(await earner.call("reputation.mine", {})).toMatchObject({
        passport: { history: [], rewards: { claimable: "0", claimed: "0" } },
      });
      await send(
        merchant,
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "refundNativeSale",
          args: [BigInt(refund.saleId)],
        }),
      );
      expect((await fetch(refund.url)).status).toBe(409);
      await expect(
        refundCustomer.call("fulfillment.access", { saleId: refund.saleId }),
      ).rejects.toMatchObject({ code: "SALE_REFUNDED" });
      await sync();
      expect(
        (await refundCustomer.call("receipts.get", { saleId: refund.saleId, chainId: 31337 }))
          .state,
      ).toBe("REFUNDED");
      expect((await earner.call("earnings.summary", {})).tokens[0]?.refunded).toBe("10000000");
      await miner.increaseTime({ seconds: 61 });
      await miner.mine({ blocks: 1 });
      await sync();
      expect((await earner.call("earnings.summary", {})).tokens[0]?.readyToFinalize).toBe(
        "10000000",
      );
      await send(
        distributor,
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "finalizeSale",
          args: [BigInt(paid.saleId)],
        }),
      );
      await sync();
      expect((await earner.call("earnings.summary", {})).tokens[0]?.claimable).toBe("10000000");
      expect(await earner.call("reputation.mine", {})).toMatchObject({
        settledConversions: 1,
        passport: {
          history: [{ direct: 1, network: 0, receiptIds: [paid.saleId] }],
          rewards: { claimable: "10000000", claimed: "0" },
        },
      });
      const activity = await customer.call("campaigns.activity", { campaignId: "1", limit: 50 });
      expect(activity.items.find((event) => event.kind === "saleFinalized")).toMatchObject({
        saleId: paid.saleId,
        nodeId: "1",
      });
      expect(activity.items.find((event) => event.kind === "saleRefunded")).toMatchObject({
        saleId: refund.saleId,
        nodeId: "1",
      });
      await send(
        distributor,
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "claimRewards",
          args: [getAddress(token)],
        }),
      );
      await send(merchant, protocolData("claimMerchantProceeds"));
      await send(merchant, protocolData("pauseCampaign"));
      await send(merchant, protocolData("refundUnusedRewardBudget"));
      await sync();
      const earnings = (await earner.call("earnings.summary", {})).tokens[0];
      expect(await earner.call("reputation.mine", {})).toMatchObject({
        passport: { rewards: { claimable: "0", claimed: "10000000" } },
      });
      expect(earnings).toMatchObject({
        atRisk: "0",
        readyToFinalize: "0",
        claimable: "0",
        claimed: "10000000",
        refunded: "10000000",
        reversed: "0",
      });
      const receipt = await customer.call("receipts.get", { saleId: paid.saleId, chainId: 31337 });
      expect(receipt.state).toBe("FINALIZED");
      expect(receipt.allocations[0]?.state).toBe("claimed");
      expect(
        (await customer.call("receipts.verify", { saleId: paid.saleId, chainId: 31337 }))
          .matchesIndex,
      ).toBe(true);
      const vault = (await seller.call("vault.get", { campaignId: "1" })).campaigns[0];
      expect(vault?.rewards).toEqual({
        netDeposited: "100000000",
        available: "0",
        pendingReserved: "0",
        vestedUnclaimed: "0",
        rewardsClaimed: "10000000",
        surplusWithdrawn: "90000000",
      });
      expect(vault?.proceeds).toEqual({
        proceedsPending: "0",
        proceedsClaimable: "0",
        proceedsClaimed: "100000000",
        buyerRefunded: "100000000",
      });
      expect(
        await chainClient.readContract({
          address: getAddress(token),
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [getAddress(protocol)],
        }),
      ).toBe(0n);
      await seller.call("ops.runReconciliation", {});
      expect((await seller.call("ops.reconciliation", {}))[0]).toMatchObject({
        matches: true,
        mismatches: [],
      });
      expect(requests).toBeGreaterThan(35);
    }, 60_000);
  },
);
