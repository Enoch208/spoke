import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSpokeClient } from "../../../packages/sdk/src/index.js";
import { createApp } from "../src/app.js";
import type { Store, StoredRecord } from "../src/db/store.js";
import { createIndexerHealthProbes } from "../src/services/indexer-health.js";
import { contract } from "./indexing-fixture.js";

const blockTime = new Date("2026-10-12T21:00:00.000Z");

describe("server indexing health through the canonical SDK", () => {
  let cursor: StoredRecord | undefined;
  const store: Pick<Store, "get"> = { get: () => Promise.resolve(cursor) };
  const checkpoint = (indexedBlockAt = blockTime.toISOString()): StoredRecord => ({
    kind: "indexer",
    id: "cursor",
    owner: "system",
    payload: {
      blockNumber: "10",
      indexedBlockAt,
      lagSeconds: 0,
      status: "live",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const client = (protocolAddress: string | null = contract) => {
    const app = createApp({
      webOrigin: "http://localhost:3040",
      probes: {
        rpc: () => Promise.resolve("ok"),
        database: () => Promise.resolve("ok"),
        chainHead: () => Promise.resolve("12"),
        ...createIndexerHealthProbes(store, protocolAddress),
      },
      config: { chainId: 31337, protocolAddress },
    });
    return createSpokeClient({
      baseUrl: "http://health.test",
      fetch: async (input, init) => await app.fetch(new Request(input, init)),
    });
  };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(blockTime);
    cursor = checkpoint();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports actual elapsed block age despite a freshly rewritten cursor and stored zero lag", async () => {
    const sdk = client();
    expect((await sdk.read("system.health", {})).indexer).toEqual({
      status: "ok",
      lastBlock: "10",
      lagSeconds: 0,
    });
    vi.setSystemTime(blockTime.getTime() + 15_000);
    expect((await sdk.read("system.health", {})).indexer).toEqual({
      status: "ok",
      lastBlock: "10",
      lagSeconds: 15,
    });
    vi.setSystemTime(blockTime.getTime() + 15_001);
    cursor = checkpoint();
    expect(cursor.updatedAt.getTime()).toBe(Date.now());
    expect(cursor.payload.lagSeconds).toBe(0);
    expect((await sdk.read("system.health", {})).indexer).toEqual({
      status: "degraded",
      lastBlock: "10",
      lagSeconds: 15.001,
    });
  });

  it.each([undefined, "invalid"])(
    "never reports a %s block timestamp as healthy",
    async (timestamp) => {
      cursor = checkpoint(timestamp);
      if (timestamp === undefined) delete cursor.payload.indexedBlockAt;
      expect((await client().read("system.health", {})).indexer).toEqual({
        status: "degraded",
        lastBlock: "10",
        lagSeconds: null,
      });
    },
  );

  it("does not report an ongoing backfill as healthy even with a recent indexed block", async () => {
    cursor = checkpoint();
    cursor.payload.status = "syncing";
    expect((await client().read("system.health", {})).indexer).toEqual({
      status: "degraded",
      lastBlock: "10",
      lagSeconds: 0,
    });
  });

  it("reports a configured indexer without a checkpoint as degraded", async () => {
    cursor = undefined;
    expect((await client().read("system.health", {})).indexer).toEqual({
      status: "degraded",
      lastBlock: null,
      lagSeconds: null,
    });
  });

  it("retains not_configured when no settlement contract is configured", async () => {
    expect((await client(null).read("system.health", {})).indexer).toEqual({
      status: "not_configured",
      lastBlock: null,
      lagSeconds: null,
    });
  });
});
