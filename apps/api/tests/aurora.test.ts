import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createLiveClient } from "../../web/src/lib/client/live/index.js";
import { createApp } from "../src/app.js";
import { createChainService } from "../src/services/chain.js";
import { createAuroraService } from "../src/services/aurora.js";
import { digest, newId } from "../src/db/store.js";
import { sessions } from "../src/db/schema.js";
import { isolatedStore } from "./isolated-store.js";
import { allocateAuroraProof, confirmAuroraDeposit } from "../src/services/aurora-allocation.js";
import { projectionKinds } from "../src/services/indexer.js";
import {
  auroraFixture,
  sourceAsset,
  targetAsset,
  fundingRecipient,
  fundingOther,
  fundingHash,
} from "./aurora-fixture.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const origin = "http://localhost:3040";
const csrf = "aurora-test-csrf";
const quoteInput = {
  originAsset: sourceAsset,
  destinationAsset: targetAsset,
  amount: "1000000",
  refundAddress: fundingRecipient,
};

describe.skipIf(!databaseUrl)(
  "Aurora wallet funding through the frontend client and persistent API",
  () => {
    let database: Awaited<ReturnType<typeof isolatedStore>> | undefined;
    let fixture = auroraFixture();
    const store = () => {
      if (!database) throw new Error("Test database unavailable");
      return database.store;
    };
    const client = (address = fundingRecipient, configured = true, csrfToken = csrf) => {
      const services = {
        store: store(),
        chain: createChainService("http://127.0.0.1:1", 31337, null, null),
        webOrigin: origin,
        production: false,
        operators: [],
      };
      const app = createApp({
        webOrigin: origin,
        probes: { rpc: () => Promise.resolve("down"), database: () => store().health() },
        config: { chainId: 31337, protocolAddress: null },
        services,
        aurora: createAuroraService(store(), configured ? fixture.provider : null, () =>
          Promise.resolve({
            state: "pending",
            txHash: null,
            blockNumber: null,
          }),
        ),
      });
      return createLiveClient({
        apiUrl: "http://aurora-api.test",
        fetcher: async (input, init) => {
          const request = new Request(input, init);
          request.headers.set("origin", origin);
          request.headers.set("cookie", `spoke_session=${address}`);
          request.headers.set("x-csrf-token", csrfToken);
          return await app.fetch(request);
        },
      });
    };
    beforeAll(async () => {
      database = await isolatedStore(
        databaseUrl ?? "",
        `aurora_${randomUUID().replaceAll("-", "")}`,
      );
    });
    afterAll(async () => {
      await database?.close();
    });
    beforeEach(async () => {
      await store().db.execute(
        sql`TRUNCATE api_records, api_sessions, api_identities, api_rate_buckets CASCADE`,
      );
      fixture = auroraFixture();
      for (const address of [fundingRecipient, fundingOther]) {
        await store().reserve("wallet", address.toLowerCase(), address);
        await store()
          .db.insert(sessions)
          .values({
            hash: digest(address),
            id: newId(),
            accountId: address,
            address,
            csrfHash: digest(csrf),
            method: "wallet",
            deviceLabel: "Aurora fixture",
            expiresAt: new Date(Date.now() + 3600000),
          });
      }
    });

    it("requires a real session and valid CSRF token before requesting a funding quote", async () => {
      await expect(
        client("0x0000000000000000000000000000000000000099").call(
          "funding.auroraPreview",
          quoteInput,
        ),
      ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await expect(
        client(fundingRecipient, true, "wrong-csrf").call("funding.auroraPreview", quoteInput),
      ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
      expect(fixture.state.calls).toEqual([]);
    });

    it("exposes only supported source networks and canonical mainnet USDC, with cached token discovery", async () => {
      const live = client();
      const config = await live.call("funding.auroraConfig", {});
      expect(config.destinationChainId).toBe(143);
      expect(config.sources.map((asset) => asset.chainId)).toEqual([8453]);
      expect(config.destinations.map((asset) => asset.symbol)).toEqual(["USDC"]);
      await live.call("funding.auroraConfig", {});
      expect(fixture.state.calls.filter((path) => path.includes("tokens"))).toHaveLength(1);
    });

    it("previews without deposit instructions and creates one recoverable owner-scoped request without touching settlement", async () => {
      const live = client();
      const preview = await live.call("funding.auroraPreview", quoteInput);
      expect(preview.recipient).toBe(fundingRecipient);
      expect(preview.amountIn).toBe("1000000");
      expect(preview).not.toHaveProperty("depositAddress");
      const request = {
        ...quoteInput,
        expectedRecipient: fundingRecipient,
        requestId: randomUUID(),
        acknowledgeMainnet: true as const,
      };
      const first = await live.call("funding.auroraCreateDeposit", request);
      expect(await live.call("funding.auroraCreateDeposit", request)).toEqual(first);
      expect(await live.call("funding.auroraDeposit", { id: first.id })).toEqual(first);
      expect(fixture.state.calls.filter((path) => path.includes("quote"))).toHaveLength(2);
      for (const kind of projectionKinds) expect((await store().list(kind)).items).toEqual([]);
    });

    it("rejects replay with changed funding details and hides another account's deposit", async () => {
      const live = client();
      const request = {
        ...quoteInput,
        expectedRecipient: fundingRecipient,
        requestId: randomUUID(),
        acknowledgeMainnet: true as const,
      };
      const deposit = await live.call("funding.auroraCreateDeposit", request);
      await expect(
        live.call("funding.auroraCreateDeposit", { ...request, amount: "2000000" }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        client(fundingOther).call("funding.auroraDeposit", { id: deposit.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("rejects an upstream quote which redirects the recipient and stores no instructions", async () => {
      fixture.state.altered = true;
      await expect(
        client().call("funding.auroraCreateDeposit", {
          ...quoteInput,
          expectedRecipient: fundingRecipient,
          requestId: randomUUID(),
          acknowledgeMainnet: true,
        }),
      ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
      expect((await store().list("aurora-deposit")).items).toEqual([]);
    });

    it("does not promote a provider success to a verified onchain receipt", async () => {
      const live = client();
      const deposit = await live.call("funding.auroraCreateDeposit", {
        ...quoteInput,
        expectedRecipient: fundingRecipient,
        requestId: randomUUID(),
        acknowledgeMainnet: true,
      });
      const row = await store().require("aurora-deposit", deposit.id);
      await store().put("aurora-deposit", deposit.id, row.owner, {
        ...row.payload,
        deposit: { ...deposit, observedAt: new Date(Date.now() - 6000).toISOString() },
      });
      fixture.state.status = "SUCCESS";
      const updated = await live.call("funding.auroraDeposit", { id: deposit.id });
      expect(updated.state).toBe("SUCCESS");
      expect(updated.confirmation.state).toBe("pending");
      expect(updated.destinationChainId).toBe(143);
    });

    it("reports missing configuration and preserves saved instructions during a provider outage", async () => {
      expect(
        (await client(fundingRecipient, false).call("funding.auroraConfig", {})).configured,
      ).toBe(false);
      await expect(
        client(fundingRecipient, false).call("funding.auroraPreview", quoteInput),
      ).rejects.toMatchObject({ code: "FEATURE_NOT_AVAILABLE" });
      const live = client();
      const deposit = await live.call("funding.auroraCreateDeposit", {
        ...quoteInput,
        expectedRecipient: fundingRecipient,
        requestId: randomUUID(),
        acknowledgeMainnet: true,
      });
      const row = await store().require("aurora-deposit", deposit.id);
      await store().put("aurora-deposit", deposit.id, row.owner, {
        ...row.payload,
        deposit: { ...deposit, observedAt: new Date(Date.now() - 6000).toISOString() },
      });
      fixture.state.failed = true;
      const restored = await live.call("funding.auroraDeposit", { id: deposit.id });
      expect(restored).toMatchObject({
        id: deposit.id,
        depositAddress: deposit.depositAddress,
        statusAvailable: false,
      });
      expect((await store().require("aurora-deposit", deposit.id)).payload.deposit).toMatchObject({
        id: deposit.id,
        state: "PENDING_DEPOSIT",
      });
    });

    it("does not let a provider extend the approved deposit deadline", async () => {
      fixture.state.alteredDeadline = true;
      await expect(
        client().call("funding.auroraCreateDeposit", {
          ...quoteInput,
          expectedRecipient: fundingRecipient,
          requestId: randomUUID(),
          acknowledgeMainnet: true,
        }),
      ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
      expect((await store().list("aurora-deposit")).items).toEqual([]);
    });

    it("rejects instructions if the authenticated recipient differs from the reviewed quote", async () => {
      await expect(
        client().call("funding.auroraCreateDeposit", {
          ...quoteInput,
          requestId: randomUUID(),
          acknowledgeMainnet: true,
          expectedRecipient: fundingOther,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(fixture.state.calls).toEqual([]);
    });

    it("keeps testnet locks available while both funding connections are waiting", async () => {
      let release = () => {};
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      let entered = 0;
      let ready = () => {};
      const acquired = new Promise<void>((resolve) => {
        ready = resolve;
      });
      const waits = ["one", "two"].map((key) =>
        store().exclusive(
          `aurora-lock:${key}`,
          () => {
            entered += 1;
            if (entered === 2) ready();
            return blocked;
          },
          "funding",
        ),
      );
      try {
        await acquired;
        await expect(
          store().exclusive(
            "third-funding-request",
            () => Promise.resolve("unexpected"),
            "funding",
          ),
        ).rejects.toMatchObject({ code: "RATE_LIMITED" });
        expect(
          await store().exclusive("testnet-indexer-isolation", () => Promise.resolve("available")),
        ).toBe("available");
      } finally {
        release();
        await Promise.all(waits);
      }
    });

    it("allocates a batch payout only once per deposit and never beyond the receipt amount", async () => {
      const deposit = await client().call("funding.auroraCreateDeposit", {
        ...quoteInput,
        expectedRecipient: fundingRecipient,
        requestId: randomUUID(),
        acknowledgeMainnet: true,
      });
      const proof = {
        state: "verified",
        txHash: fundingHash,
        blockNumber: "99",
        receivedAmount: "1980000",
      } as const;
      expect((await allocateAuroraProof(store(), fundingRecipient, deposit, proof)).state).toBe(
        "verified",
      );
      expect((await allocateAuroraProof(store(), fundingRecipient, deposit, proof)).state).toBe(
        "verified",
      );
      expect(
        (
          await allocateAuroraProof(
            store(),
            fundingRecipient,
            { ...deposit, id: randomUUID() },
            proof,
          )
        ).state,
      ).toBe("verified");
      expect(
        (
          await allocateAuroraProof(
            store(),
            fundingRecipient,
            { ...deposit, id: randomUUID() },
            proof,
          )
        ).state,
      ).toBe("pending");
      const secondHash = `0x${"34".repeat(32)}`;
      const another = {
        ...deposit,
        id: randomUUID(),
        state: "SUCCESS" as const,
        destinationTxHashes: [fundingHash, secondHash],
      };
      expect(
        (
          await confirmAuroraDeposit(store(), fundingRecipient, another, (candidate) =>
            Promise.resolve({
              ...proof,
              txHash: candidate.destinationTxHashes[0] ?? null,
            }),
          )
        ).txHash,
      ).toBe(secondHash);
      expect(
        (
          await confirmAuroraDeposit(
            store(),
            fundingRecipient,
            {
              ...another,
              id: randomUUID(),
            },
            (candidate) =>
              Promise.resolve(
                candidate.destinationTxHashes[0] === fundingHash
                  ? { state: "unavailable", txHash: null, blockNumber: null }
                  : { ...proof, txHash: secondHash },
              ),
          )
        ).state,
      ).toBe("verified");
    });

    it("resumes after a timed-out candidate instead of repeating a failing hash prefix", async () => {
      const deposit = await client().call("funding.auroraCreateDeposit", {
        ...quoteInput,
        requestId: randomUUID(),
        acknowledgeMainnet: true,
        expectedRecipient: fundingRecipient,
      });
      const secondHash = `0x${"78".repeat(32)}`;
      const value = {
        ...deposit,
        state: "SUCCESS" as const,
        destinationTxHashes: [fundingHash, secondHash],
      };
      const abort = new AbortController();
      const first = await confirmAuroraDeposit(
        store(),
        fundingRecipient,
        value,
        () => {
          abort.abort();
          return Promise.resolve({ state: "unavailable", txHash: null, blockNumber: null });
        },
        0,
        abort.signal,
      );
      expect(first.nextCursor).toBe(1);
      expect(first.state).toBe("unavailable");
      const resumed = await confirmAuroraDeposit(
        store(),
        fundingRecipient,
        value,
        (candidate) =>
          Promise.resolve({
            state: "verified",
            txHash: candidate.destinationTxHashes[0] ?? null,
            blockNumber: "99",
            receivedAmount: "990000",
          }),
        first.nextCursor,
      );
      expect(resumed.txHash).toBe(secondHash);
      expect(resumed.state).toBe("verified");
    });

    it("requires external wallet access before issuing real mainnet instructions", async () => {
      await store().db.execute(sql`UPDATE api_sessions SET method = 'passkey'`);
      await expect(client().call("funding.auroraPreview", quoteInput)).rejects.toMatchObject({
        code: "FEATURE_NOT_AVAILABLE",
      });
      await expect(
        client().call("funding.auroraCreateDeposit", {
          ...quoteInput,
          expectedRecipient: fundingRecipient,
          requestId: randomUUID(),
          acknowledgeMainnet: true,
        }),
      ).rejects.toMatchObject({ code: "FEATURE_NOT_AVAILABLE" });
      expect(fixture.state.calls).toEqual([]);
    });
  },
);
