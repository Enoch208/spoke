import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sql } from "drizzle-orm";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { connectStore } from "../src/db/store.js";
import { createChainService } from "../src/services/chain.js";
import { purchasedProduct } from "../src/services/fulfillment.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const buyer = privateKeyToAccount(`0x${"01".padStart(64, "0")}`);
const stranger = privateKeyToAccount(`0x${"02".padStart(64, "0")}`);
const token = "0x0000000000000000000000000000000000000001";
const hash = `0x${"ab".repeat(32)}` as const;
const origin = "http://localhost:3140";
describe.skipIf(!databaseUrl)("direct-chain delivery and upload isolation", () => {
  const store = connectStore(databaseUrl ?? "postgres://localhost:54332/spoke_test");
  const chain = createChainService("http://127.0.0.1:1", 31337, null, null);
  const services = {
    store,
    chain,
    webOrigin: origin,
    production: false,
    operators: [],
    apiOrigin: "http://localhost:18740",
    storageDirectory: "",
  };
  const app = createApp({
    webOrigin: origin,
    probes: { rpc: () => Promise.resolve("down" as const) },
    config: { chainId: 31337, protocolAddress: null },
    services,
  });
  let refunded = false;
  const signIn = async (wallet = buyer) => {
    const request = (path: string, body: unknown) =>
      app.request(`/v1${path}`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    const challenge = z
      .object({ data: z.object({ message: z.string() }) })
      .parse(
        await (
          await request("/auth/challenge", { address: wallet.address, chainId: 31337 })
        ).json(),
      ).data;
    const response = await request("/auth/verify", {
      message: challenge.message,
      signature: await wallet.signMessage({ message: challenge.message }),
      method: "wallet",
    });
    const csrf = z
      .object({ data: z.object({ csrfToken: z.string() }) })
      .parse(await response.json()).data.csrfToken;
    return {
      origin,
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
      "x-csrf-token": csrf,
    };
  };
  beforeAll(async () => {
    await store.migrate();
    services.storageDirectory = await mkdtemp(join(tmpdir(), "spoke-delivery-"));
    vi.spyOn(chain, "sale").mockImplementation(() =>
      Promise.resolve([
        {
          campaignId: 1n,
          nodeId: 0n,
          buyer: buyer.address,
          orderKey: hash,
          policyHash: hash,
          policyVersion: 1,
          price: 10n,
          rewardReserved: 0n,
          purchasedAt: 1n,
          unlockAt: 2n,
          status: refunded ? 2 : 1,
          source: 0,
        },
        [],
      ]),
    );
    const policy = {
      rewardToken: token,
      commissionBps: 1000,
      perSaleCap: 1n,
      campaignLiabilityCap: 100n,
      maxRewardedAncestors: 1,
      weightsBps: [10000],
      shortPathMode: 0,
      holdSeconds: 60n,
      expiry: 100n,
      eligibilityHash: hash,
    } as const;
    const version = { policy, policyHash: hash, version: 1, effectiveAt: 1n };
    vi.spyOn(chain, "campaign").mockResolvedValue({
      campaign: {
        merchant: buyer.address,
        token,
        metadataHash: hash,
        skuHash: hash,
        skuPrice: 10n,
        createdAt: 1n,
        endsAt: 100n,
        active: true,
        paused: false,
        ended: false,
        nodeCount: 0n,
        saleCount: 1n,
      },
      rewards: {
        netDeposited: 0n,
        available: 0n,
        pendingReserved: 0n,
        vestedUnclaimed: 0n,
        rewardsClaimed: 0n,
        surplusWithdrawn: 0n,
      },
      proceeds: {
        received: 10n,
        proceedsPending: 10n,
        proceedsClaimable: 0n,
        proceedsClaimed: 0n,
        buyerRefunded: 0n,
      },
      currentPolicy: version,
      scheduledPolicy: version,
    });
  });
  beforeEach(async () => {
    refunded = false;
    await store.db.execute(
      sql`TRUNCATE api_records, api_identities, api_challenges, api_sessions, api_confirmations, api_idempotency, api_rate_buckets, api_chain_events`,
    );
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await store.close();
    await rm(services.storageDirectory, { recursive: true, force: true });
  });
  const upload = async (
    headers: Record<string, string>,
    file = new File(["paid private content"], "manual.txt", { type: "text/plain" }),
  ) => {
    const form = new FormData();
    form.set("file", file);
    return app.request("/v1/merchant/products/product_one/assets", {
      method: "POST",
      headers,
      body: form,
    });
  };
  it("grants access without an indexed sale, rejects other buyers and revokes an existing URL on refund", async () => {
    const headers = await signIn();
    await store.put("merchant", "merchant_one", buyer.address.toLowerCase(), {
      address: buyer.address,
      closedAt: null,
    });
    const uploaded = await upload(headers);
    expect(uploaded.status).toBe(201);
    const asset = z
      .object({ data: z.object({ id: z.string(), sha256: z.string() }) })
      .parse(await uploaded.json()).data;
    await store.put("product-version", "product_one_1", buyer.address.toLowerCase(), {
      merchantId: "merchant_one",
      skuHash: hash,
      deliverable: asset.id,
      fulfillmentMode: "download",
    });
    expect((await store.list("receipt")).items).toEqual([]);
    expect((await app.request(`/v1/assets/${asset.id}`)).status).toBe(404);
    const denied = await app.request("/v1/fulfillment/1/access", {
      method: "POST",
      headers: await signIn(stranger),
    });
    expect(denied.status).toBe(403);
    const granted = await app.request("/v1/fulfillment/1/access", { method: "POST", headers });
    expect(granted.status).toBe(200);
    const grant = z
      .object({ data: z.object({ items: z.array(z.object({ url: z.string() })) }) })
      .parse(await granted.json()).data.items[0];
    if (!grant) throw new Error("Missing access grant");
    const download = await app.request(new URL(grant.url).pathname + new URL(grant.url).search);
    expect(download.status).toBe(200);
    expect(await download.text()).toBe("paid private content");
    refunded = true;
    const revoked = await app.request(new URL(grant.url).pathname + new URL(grant.url).search);
    expect(revoked.status).toBe(409);
    expect(await revoked.json()).toMatchObject({ error: { code: "SALE_REFUNDED" } });
  });
  it("rejects forged image content, missing CSRF and cross-origin writes", async () => {
    const headers = await signIn();
    await store.put("merchant", "merchant_one", buyer.address.toLowerCase(), {
      address: buyer.address,
      closedAt: null,
    });
    expect(
      (await upload(headers, new File(["not a decoded image"], "logo.png", { type: "image/png" })))
        .status,
    ).toBe(400);
    expect((await upload({ ...headers, "x-csrf-token": "" })).status).toBe(403);
    expect((await upload({ ...headers, origin: "https://attacker.example" })).status).toBe(403);
    expect((await store.list("asset")).items).toEqual([]);
  });

  it("permits verified linked buyers without widening access to another account", async () => {
    const owner = "linked_buyer_account";
    await store.reserve("wallet", buyer.address.toLowerCase(), owner);
    await store.put("merchant", "merchant_linked", "merchant_owner", {
      address: buyer.address,
      closedAt: null,
    });
    await store.put("product-version", "linked_product_1", "merchant_owner", {
      merchantId: "merchant_linked",
      skuHash: hash,
      deliverable: "Purchased instructions",
      fulfillmentMode: "manual",
    });
    expect((await purchasedProduct(services, "1", stranger.address, owner)).sale.buyer).toBe(
      buyer.address,
    );
    await expect(
      purchasedProduct(services, "1", stranger.address, "another_account"),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
  });
  it("keeps browser credentials confined to the app origin and denies playground traversal", async () => {
    const response = await app.request("/v1/system/contracts", { headers: { origin } });
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    const external = await app.request("/v1/system/contracts", {
      headers: { origin: "https://widget.example" },
    });
    expect(external.headers.get("access-control-allow-origin")).toBe("*");
    expect(external.headers.get("access-control-allow-credentials")).toBeNull();
    for (const path of [
      "https://attacker.example/v1/health",
      "/v1/../me",
      "/v1/%2e%2e/me",
      "/v1/me",
    ]) {
      const result = await app.request("/v1/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      expect([400, 403]).toContain(result.status);
    }
  });
});
