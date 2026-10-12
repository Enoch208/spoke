import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createChainService } from "../src/services/chain.js";
import { createIndexer } from "../src/services/indexer.js";
import { runReconciliation } from "../src/services/ops-reconciliation.js";
import type { Services } from "../src/types.js";
import { isolatedStore } from "./isolated-store.js";
import { contract, paymentToken, fixtureRpc } from "./indexing-fixture.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const barrier = () => {
  let complete: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    complete = resolve;
  });
  return {
    promise,
    resolve() {
      if (!complete) throw new Error("Test barrier unavailable.");
      complete();
    },
  };
};

describe.skipIf(!databaseUrl)("operator reconciliation projection concurrency", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  let rpc: Awaited<ReturnType<typeof fixtureRpc>>;
  const workers: ReturnType<typeof createIndexer>[] = [];
  beforeAll(async () => {
    database = await isolatedStore(
      databaseUrl ?? "",
      `reconciliation_${randomUUID().replaceAll("-", "")}`,
    );
    rpc = await fixtureRpc();
  });
  beforeEach(async () => {
    for (const worker of workers) worker.stop();
    rpc.state.reorg = false;
    rpc.state.failed = false;
    await database.store.db.execute(sql`TRUNCATE api_records, api_chain_events, api_identities`);
  });
  afterAll(async () => {
    for (const worker of workers) worker.stop();
    await rpc.close();
    await database.close();
  });
  const snapshot = async () => {
    const { store } = database;
    const chain = createChainService(rpc.url, 31337, contract, paymentToken);
    const worker = createIndexer(store, chain, 1n);
    workers.push(worker);
    expect(await worker.tick()).toMatchObject({ status: "indexed", blockNumber: "8" });
    const cursor = await store.require("indexer", "cursor");
    await store.put("indexer", "cursor", "system", { ...cursor.payload, blockNumber: "7" });
    const services: Services = {
      store,
      chain,
      webOrigin: "http://localhost:3040",
      production: false,
      operators: [],
    };
    return { store, chain, worker, services };
  };
  it("holds the indexed snapshot through pinned reads while independent projection ticks skip", async () => {
    const { store, chain, worker, services } = await snapshot();
    const started = barrier();
    const released = barrier();
    const pending = runReconciliation({
      ...services,
      chain: {
        ...chain,
        campaign: async (id, block) => {
          started.resolve();
          await released.promise;
          return await chain.campaign(id, block);
        },
      },
    });
    await started.promise;
    let during: Awaited<ReturnType<typeof worker.tick>>;
    try {
      during = await worker.tick();
    } finally {
      released.resolve();
    }
    const result = await pending;
    expect(during).toEqual({ status: "busy" });
    expect(result).toMatchObject({ matches: true, blockNumber: "7", mismatches: [] });
    expect((await store.require("indexer", "cursor")).payload.blockNumber).toBe("7");
    expect((await store.require("reconciliation", "latest")).payload).toEqual(result);
    expect(await store.get("indexer", "failure")).toBeUndefined();
    expect(await worker.tick()).toMatchObject({ status: "indexed", blockNumber: "8" });
    expect((await store.require("indexer", "cursor")).payload.blockNumber).toBe("8");
    expect(rpc.state.errors).toEqual([]);
  });
  it("still rejects an actual chain reorg without replacing the last successful result", async () => {
    const { store, chain, services } = await snapshot();
    const previous = { matches: true, blockNumber: "6" };
    await store.put("reconciliation", "latest", "system", previous);
    const pending = runReconciliation({
      ...services,
      chain: {
        ...chain,
        campaign: async (id, block) => {
          const value = await chain.campaign(id, block);
          rpc.state.reorg = true;
          return value;
        },
      },
    });
    await expect(pending).rejects.toMatchObject({ code: "INDEXER_LAGGING", status: 409 });
    expect((await store.require("reconciliation", "latest")).payload).toEqual(previous);
    expect(await store.exclusive("spoke-indexer", () => Promise.resolve("released"))).toBe(
      "released",
    );
    expect(rpc.state.errors).toEqual([]);
  });
});
