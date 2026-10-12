import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { isolatedStore } from "./isolated-store.js";
import { fixtureRpc, contract, paymentToken, distributor, merchant } from "./indexing-fixture.js";
import { createChainService } from "../src/services/chain.js";
import { createIndexer, cursorSchema } from "../src/services/indexer.js";
import { deriveBatch } from "../src/services/indexing/derived.js";
import { sourceEvent } from "../src/services/indexing/source.js";

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("canonical persistent indexer", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  let rpc: Awaited<ReturnType<typeof fixtureRpc>>;
  const workers: ReturnType<typeof createIndexer>[] = [];
  beforeAll(async () => {
    database = await isolatedStore(url ?? "", `indexer_${randomUUID().replaceAll("-", "")}`);
    rpc = await fixtureRpc();
  });
  afterAll(async () => {
    for (const worker of workers) worker.stop();
    await rpc.close();
    await database.close();
  });
  beforeEach(async () => {
    for (const worker of workers) worker.stop();
    await database.store.db.execute(sql`truncate api_records, api_chain_events, api_identities`);
    rpc.state.reorg = false;
    rpc.state.failed = false;
  });
  const worker = () => {
    const value = createIndexer(
      database.store,
      createChainService(rpc.url, 31337, contract, paymentToken),
      1n,
    );
    workers.push(value);
    return value;
  };
  it("commits canonical projections and allocation claim flags once", async () => {
    const indexer = worker();
    const result = await indexer.tick();
    expect(rpc.state.errors).toEqual([]);
    expect(result).toMatchObject({ status: "indexed", events: 1 });
    const receipt = await database.store.require("receipt", "1");
    expect(receipt.payload.allocationClaims).toEqual([true]);
    expect((await database.store.list("allocation")).items).toHaveLength(1);
    expect(
      cursorSchema.parse((await database.store.require("indexer", "cursor")).payload),
    ).toMatchObject({ source: "direct_rpc", blockNumber: "8" });
    expect(await indexer.tick()).toMatchObject({ status: "idle" });
    expect((await database.store.list("notification")).items).toHaveLength(2);
  });
  it("replays a reorg atomically while preserving offchain notifications", async () => {
    const indexer = worker();
    await indexer.tick();
    const old = await database.store.require("indexer", "cursor");
    await database.store.put("notification", "offchain", "owner", { source: "api" });
    await database.store.put("campaign-metadata", "orphan", "owner", { indexedAttachment: true });
    await database.store.put("campaign-metadata", "offchain", "owner", { productId: "original" });
    rpc.state.reorg = true;
    expect(await indexer.tick()).toMatchObject({ status: "indexed" });
    const next = await database.store.require("indexer", "cursor");
    expect(next.payload.blockHash).not.toBe(old.payload.blockHash);
    const count = await database.store.db.execute(
      sql`select count(*)::int as count from api_chain_events`,
    );
    expect(count[0]?.count).toBe(1);
    expect(await database.store.get("notification", "offchain")).toBeDefined();
    expect(await database.store.get("campaign-metadata", "orphan")).toBeUndefined();
    expect(await database.store.get("campaign-metadata", "offchain")).toBeDefined();
  });
  it("retains the last committed snapshot on provider failure", async () => {
    const indexer = worker();
    await indexer.tick();
    const old = await database.store.require("indexer", "cursor");
    rpc.state.failed = true;
    expect(await indexer.tick()).toMatchObject({ status: "failed" });
    expect((await database.store.require("indexer", "cursor")).payload).toEqual(old.payload);
    expect(await database.store.get("indexer", "failure")).toBeDefined();
  });
  it("replays deleted merchants' historical metadata only with verified retained provenance", async () => {
    const store = database.store;
    const owner = "historical-merchant-account";
    const metadata = { merchantId: owner, productId: "historical-product", productVersion: 1 };
    await store.reserve("wallet", merchant, owner);
    await store.put("merchant", owner, owner, { address: merchant });
    await store.put("campaign-metadata-commitment", `0x${"01".repeat(32)}`, owner, metadata);
    const indexer = worker();
    expect(await indexer.tick()).toMatchObject({ status: "indexed" });
    expect((await store.require("campaign-metadata", "1")).payload).toMatchObject(metadata);
    await store.db.execute(sql`truncate api_identities`);
    rpc.state.reorg = true;
    expect(await indexer.tick()).toMatchObject({ status: "indexed" });
    expect(await store.require("campaign-metadata", "1")).toMatchObject({
      owner,
      payload: metadata,
    });
    await store.remove("merchant", owner, owner);
    await store.put("merchant", owner, "different-account", { address: merchant });
    rpc.state.reorg = false;
    expect(await indexer.tick()).toMatchObject({ status: "indexed" });
    expect(await store.get("campaign-metadata", "1")).toBeUndefined();
    await store.remove("merchant", owner, "different-account");
    await store.put("merchant", owner, owner, { address: distributor });
    rpc.state.reorg = true;
    expect(await indexer.tick()).toMatchObject({ status: "indexed" });
    expect(await store.get("campaign-metadata", "1")).toBeUndefined();
  });
  it("serializes independent workers with a database advisory lock", async () => {
    const statuses = (await Promise.all([worker().tick(), worker().tick()]))
      .map((result) => result.status)
      .sort();
    expect(statuses).toEqual(["busy", "indexed"]);
  });
  it("creates N39 only for upcoming policy versions for link owners and invitees", async () => {
    const store = database.store;
    const invited = "0x0000000000000000000000000000000000000051";
    await store.put("invitation", "invite", "merchant", {
      campaignId: "1",
      status: "pending",
      distributor: invited,
    });
    const event = sourceEvent.parse({
      id: "event",
      chainId: 31337,
      txHash: `0x${"01".repeat(32)}`,
      blockHash: `0x${"02".repeat(32)}`,
      blockNumber: "3",
      logIndex: 0,
      name: "PolicyVersionRegistered",
      payload: { campaignId: "1", version: "2", effectiveAt: "200000" },
      at: new Date(),
    });
    await store.reserve("wallet", invited, "invited-account");
    const projected = [{ kind: "node", id: "1", owner: distributor, payload: { campaignId: "1" } }];
    const notifications = (await deriveBatch(store, [event], projected, new Date())).filter(
      (row) => row.kind === "notification",
    );
    expect(notifications.map((row) => row.owner).sort()).toEqual(
      [distributor, "invited-account"].sort(),
    );
    expect(
      notifications.every(
        (row) => row.payload.kind === "campaign.termsChanging" && row.payload.workspace === "earn",
      ),
    ).toBe(true);
    event.payload.version = "1";
    expect(await deriveBatch(store, [event], projected, new Date())).toEqual([]);
  });
});
