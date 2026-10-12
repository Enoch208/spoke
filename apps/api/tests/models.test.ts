import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { clientMethodSchemas, hashPolicy } from "@spoke/protocol";
import { createApp } from "../src/app.js";
import { connectStore } from "../src/db/store.js";
import { createChainService } from "../src/services/chain.js";
import { events } from "../src/db/schema.js";
import { discoveryScore } from "../src/services/discovery.js";
import { allocationBucket } from "../src/services/earnings.js";
import { intentView } from "../src/services/intents.js";
import { reconciliationView } from "../src/services/report-reconciliation.js";
import { sliceView } from "../src/services/graph.js";
import {
  contract,
  paymentToken,
  distributor,
  merchant,
  buyer,
  fixtureRpc,
} from "./indexing-fixture.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const hash = `0x${"aa".repeat(32)}`;
const second = "0x0000000000000000000000000000000000000066";
const now = BigInt(Math.floor(Date.now() / 1000));
const policy = {
  rewardToken: paymentToken,
  commissionBps: 1000,
  maxRewardedAncestors: 2,
  weightsBps: [7500, 2500],
  perSaleCap: "100",
  campaignLiabilityCap: "10000",
  holdSeconds: 60,
  expiry: (now + 86400n).toString(),
  shortPathMode: "RENORMALIZE_EXISTING" as const,
  eligibilityHash: hash,
};

describe("discovery and earning invariants", () => {
  it("caps evidence and applies the published refund and recency factors", () => {
    expect(discoveryScore(100, 20, 0, 0).score).toBe(40);
    expect(discoveryScore(10, 2, 10, 30).score).toBe(9);
    expect(discoveryScore(10, 2, 10, 105).score).toBeCloseTo(5.4);
    expect(discoveryScore(10, 2, 10, 180).score).toBeCloseTo(1.8);
  });
  it("keeps pending maturity separate from actual finalization and refunds", () => {
    const row = {
      kind: "receipt",
      id: "1",
      owner: buyer,
      payload: { status: 1, unlockAt: "100", allocationClaims: [false] },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(allocationBucket(row, 0, 99n)).toBe("atRisk");
    expect(allocationBucket(row, 0, 100n)).toBe("readyToFinalize");
    expect(allocationBucket({ ...row, payload: { ...row.payload, status: 2 } }, 0, 100n)).toBe(
      "refunded",
    );
    expect(allocationBucket({ ...row, payload: { ...row.payload, status: 3 } }, 0, 100n)).toBe(
      "claimable",
    );
    expect(
      allocationBucket(
        { ...row, payload: { ...row.payload, status: 3, allocationClaims: [true] } },
        0,
        100n,
      ),
    ).toBe("claimed");
  });
});

describe.skipIf(!databaseUrl)("canonical public read models and consent", () => {
  const store = connectStore(databaseUrl ?? "postgres://localhost:54332/spoke_test");
  const services = {
    store,
    chain: createChainService("http://127.0.0.1:1", 31337, contract, paymentToken),
    webOrigin: "http://localhost:3040",
    production: false,
    operators: [],
  };
  const app = createApp({
    webOrigin: services.webOrigin,
    probes: { rpc: () => Promise.resolve("down" as const), database: () => store.health() },
    config: { chainId: 31337, protocolAddress: contract },
    services,
  });
  const read = async (path: string) => {
    const response = await app.request(`/v1${path}`);
    expect(response.status).toBe(200);
    return z.object({ data: z.unknown() }).parse(await response.json()).data;
  };
  const visibility = async (level: "private" | "public" | "pseudonymous", fields: string[]) => {
    await store.put("account", distributor, distributor, {
      address: distributor,
      handle: "alice_test",
      displayName: "Alice Private Name",
      visibility: { level, fields, acceptsInvitations: true },
    });
    await store.reserve("wallet", distributor, distributor);
    await store.reserve("handle", "alice_test", distributor);
  };
  beforeAll(async () => {
    await store.migrate();
  });
  beforeEach(async () => {
    await store.db.execute(
      sql`TRUNCATE api_records,api_identities,api_challenges,api_sessions,api_confirmations,api_idempotency,api_rate_buckets,api_chain_events`,
    );
    await store.put("indexer", "cursor", "system", {
      blockNumber: "10",
      blockTimestamp: now.toString(),
      indexedAt: new Date().toISOString(),
      source: "direct_rpc",
    });
    await store.put("campaign", "1", merchant, {
      merchant,
      chainId: 31337,
      contractAddress: contract,
      skuHash: hash,
      skuPrice: "100",
      token: paymentToken,
      createdAt: (now - 86400n).toString(),
      endsAt: (now + 86400n).toString(),
      active: true,
      paused: false,
      ended: false,
      policy: {
        ...policy,
        policyHash: hashPolicy(policy),
        version: 1,
        effectiveAt: new Date(Number(now - 86400n) * 1000).toISOString(),
        regions: [],
        sharingRules: [],
      },
      rewardLedger: {
        netDeposited: "1000",
        available: "940",
        pendingReserved: "20",
        vestedUnclaimed: "40",
        rewardsClaimed: "0",
        surplusWithdrawn: "0",
      },
      proceedsLedger: {
        received: "300",
        proceedsPending: "100",
        proceedsClaimable: "100",
        proceedsClaimed: "0",
        buyerRefunded: "100",
      },
      indexedBlock: "10",
    });
    await store.put("node", "1", distributor, {
      campaignId: "1",
      parentId: "0",
      creator: distributor,
      createdAt: (now - 60n).toString(),
    });
    await store.put("node", "2", second, {
      campaignId: "1",
      parentId: "1",
      creator: second,
      createdAt: (now - 30n).toString(),
    });
    for (const [id, status, amount] of [
      ["1", 3, "10"],
      ["2", 1, "20"],
      ["3", 2, "30"],
    ] as const) {
      await store.put("receipt", id, buyer, {
        campaignId: "1",
        nodeId: "1",
        buyer,
        orderKey: hash,
        policyHash: hashPolicy(policy),
        policyVersion: 1,
        price: "100",
        rewardReserved: amount,
        purchasedAt: (now - 100n).toString(),
        unlockAt: (now - 40n).toString(),
        status,
        allocations: [{ recipient: distributor, amount, depth: 0, effectiveWeightBps: 10000 }],
        allocationClaims: [false],
        indexedBlock: "10",
      });
      await store.db.insert(events).values({
        id: `purchase-${id}`,
        chainId: 31337,
        txHash: hash,
        blockHash: hash,
        blockNumber: "5",
        logIndex: Number(id),
        name: "NativePurchaseAccepted",
        payload: { saleId: id, campaignId: "1", buyer, nodeId: "1", price: "100" },
        at: new Date(Number(now - 100n) * 1000),
      });
      if (status !== 1)
        await store.db.insert(events).values({
          id: `result-${id}`,
          chainId: 31337,
          txHash: hash,
          blockHash: hash,
          blockNumber: "8",
          logIndex: Number(id) + 10,
          name: status === 3 ? "SaleFinalized" : "SaleRefunded",
          payload: { saleId: id, campaignId: "1" },
          at: new Date(Number(now - 20n) * 1000),
        });
    }
  });
  afterAll(async () => {
    await store.close();
  });
  it("returns no public record or discovery result for a private handle", async () => {
    await visibility("private", []);
    expect(await read("/distributors/alice_test/profile")).toEqual({ hidden: true });
    const results = clientMethodSchemas["distributors.search"].output.parse(
      await read("/distributors"),
    );
    expect(results.items).toHaveLength(0);
    expect(results.newDistributors).toHaveLength(0);
    await store.db.execute(sql`DELETE FROM api_chain_events WHERE name = 'SaleFinalized'`);
    expect(await read("/distributors/alice_test/profile")).toEqual({ hidden: true });
    expect((await app.request(`/v1/distributors/${distributor}`)).status).toBe(404);
  });
  it("redacts pseudonymous identity and every unchosen performance field", async () => {
    await visibility("pseudonymous", ["settledConversions", "refundAdjustment"]);
    const result = await read("/distributors/alice_test/profile");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(distributor);
    expect(serialized).not.toContain("Alice Private Name");
    expect(serialized).not.toContain("purchaseTx");
    expect(result).toMatchObject({
      subject: null,
      displayName: null,
      settledConversions: 1,
      netAttributedValue: null,
      merchantCount: null,
      refundAdjustment: "30",
      evidence: { items: [] },
      perMerchant: [],
      perCampaign: [],
      indexing: "noindex",
    });
  });
  it("does not rank a profile using withheld performance", async () => {
    await visibility("public", ["settledConversions", "refundAdjustment"]);
    const result = clientMethodSchemas["distributors.search"].output.parse(
      await read("/distributors"),
    );
    expect(result.items).toHaveLength(0);
    expect(result.newDistributors[0]?.merchantCount).toBeNull();
    expect(
      result.newDistributors[0]?.rankSignals.some((signal) => signal.name === "distinctMerchants"),
    ).toBe(false);
  });
  it("counts only final sales in public performance while separately disclosing refunds", async () => {
    await visibility("public", [
      "settledConversions",
      "netAttributedValue",
      "merchantCount",
      "campaignCount",
      "refundAdjustment",
    ]);
    const result = clientMethodSchemas["reputation.get"].output.parse(
      await read(`/distributors/${distributor}/profile`),
    );
    expect(result).toMatchObject({
      settledConversions: 1,
      directConversions: 1,
      networkConversions: 0,
      netAttributedValue: "100",
      refundAdjustment: "30",
      merchantCount: 1,
      campaignCount: 1,
      evidencePeriod: {
        from: new Date(Number(now - 20n) * 1000).toISOString(),
        to: new Date(Number(now - 20n) * 1000).toISOString(),
      },
    });
    const results = clientMethodSchemas["distributors.search"].output.parse(
      await read("/distributors"),
    );
    expect(results.items[0]?.settledConversions).toBe(1);
  });
  it("recovers an interrupted order from canonical chain state and rejects a conflicting buyer", async () => {
    const rpc = await fixtureRpc();
    const chain = createChainService(rpc.url, 31337, contract, paymentToken);
    const orderKey = `0x${"01".repeat(32)}`;
    try {
      const payload = {
        campaignId: "1",
        nodeId: "1",
        buyer,
        orderKey,
        expectedPrice: "100",
        expectedReward: "10",
        policyHash: orderKey,
        chainId: 31337,
        to: contract,
        data: "0x",
        value: "0",
        id: "00000000-0000-4000-8000-000000000001",
        status: "created",
        txHash: null,
        saleId: null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      await store.put("intent", "intent-test", buyer, payload);
      const row = await store.require("intent", "intent-test");
      expect(await intentView({ ...services, chain }, row)).toMatchObject({
        status: "included",
        saleId: "1",
      });
      await expect(
        intentView({ ...services, chain }, { ...row, payload: { ...row.payload, buyer: second } }),
      ).rejects.toMatchObject({ code: "DUPLICATE_CHECKOUT" });
      expect(rpc.state.errors).toEqual([]);
    } finally {
      await rpc.close();
    }
  });
  it("rejects export snapshots after a canonical block hash changes", async () => {
    const rpc = await fixtureRpc();
    const chain = createChainService(rpc.url, 31337, contract, paymentToken);
    const blockHash = `0x${"01".repeat(32)}`;
    try {
      const cursor = await store.require("indexer", "cursor");
      await store.put("indexer", "cursor", "system", { ...cursor.payload, blockHash });
      const result = await reconciliationView({ ...services, chain }, merchant, new Set(["1"]));
      expect(result.matches).toBe(false);
      expect(result.mismatches.some((row) => row.field === "available")).toBe(true);
      rpc.state.reorg = true;
      await expect(
        reconciliationView({ ...services, chain }, merchant, new Set(["1"])),
      ).rejects.toMatchObject({ code: "INDEXER_LAGGING" });
      expect(rpc.state.errors).toEqual([]);
    } finally {
      await rpc.close();
    }
  });
  it("reveals only owned wallet addresses in a personal graph context", async () => {
    const rows = [await store.require("node", "1"), await store.require("node", "2")];
    const graph = await sliceView(store, rows, false, new Set([distributor]));
    expect(graph.nodes[0]?.owner.address?.toLowerCase()).toBe(distributor);
    expect(graph.nodes[1]?.owner.address).toBeNull();
  });
  it("masks buyers and private dispute details in public evidence", async () => {
    await store.put("dispute", "1", merchant, {
      status: "open",
      requester: buyer,
      message: "A private refund explanation",
    });
    const receipt = clientMethodSchemas["receipts.get"].output.parse(
      await read("/receipts/31337/1"),
    );
    expect(receipt.buyer).toBeNull();
    expect(receipt.refundRequest).toBeNull();
    const proof = clientMethodSchemas["receipts.events"].output.parse(
      await read("/receipts/31337/1/events"),
    );
    expect(JSON.stringify(proof)).not.toContain(buyer);
    expect(proof[0]?.args.buyer).toBeUndefined();
  });
  it("supports canonical graph shapes and exact pagination without leaking private handles", async () => {
    await visibility("private", []);
    const graph = clientMethodSchemas["graph.forCampaign"].output.parse(
      await read("/campaigns/1/graph"),
    );
    expect(graph.nodes[0]?.owner).toMatchObject({
      address: null,
      handle: null,
      displayName: "Someone",
    });
    expect(graph.saleMarkers).toHaveLength(3);
    expect(
      clientMethodSchemas["graph.search"].output.parse(
        await read("/campaigns/1/graph/search?q=alice_test"),
      ),
    ).toHaveLength(0);
    const first = clientMethodSchemas["receipts.recent"].output.parse(
      await read("/receipts?limit=2"),
    );
    expect(first.items.map((row) => row.saleId)).toEqual(["3", "2"]);
    const next = clientMethodSchemas["receipts.recent"].output.parse(
      await read(`/receipts?limit=2&cursor=${first.nextCursor ?? ""}`),
    );
    expect(next.items.map((row) => row.saleId)).toEqual(["1"]);
  });
  it("never exposes owner visit estimates or earnings through public links", async () => {
    await store.db.insert(events).values({
      id: "node-proof",
      chainId: 31337,
      txHash: hash,
      blockHash: hash,
      blockNumber: "4",
      logIndex: 40,
      name: "NodeCreated",
      payload: { nodeId: "1", campaignId: "1", owner: distributor },
      at: new Date(),
    });
    const result = clientMethodSchemas["links.get"].output.parse(await read("/links/1"));
    expect(result.visitsEstimate).toBeNull();
    expect(result.earned).toBeNull();
    expect(result.url).toBe("http://localhost:3040/r/31337-1");
  });
});
