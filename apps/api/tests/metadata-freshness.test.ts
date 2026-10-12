import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createSpokeClient } from "../../../packages/sdk/src/index.js";
import { createApp } from "../src/app.js";
import { createChainService } from "../src/services/chain.js";
import { contract, paymentToken } from "./indexing-fixture.js";
import { isolatedStore } from "./isolated-store.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const checkpointTime = new Date("2026-10-12T21:00:00.000Z");

describe.skipIf(!databaseUrl)("canonical response indexing freshness", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  beforeAll(async () => {
    database = await isolatedStore(
      databaseUrl ?? "",
      `freshness_${randomUUID().replaceAll("-", "")}`,
    );
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  afterAll(async () => {
    await database.close();
  });

  const client = () => {
    const { store } = database;
    const app = createApp({
      webOrigin: "http://localhost:3040",
      probes: { database: () => store.health(), rpc: () => Promise.resolve("ok" as const) },
      config: { chainId: 31337, protocolAddress: contract },
      services: {
        store,
        chain: createChainService("http://127.0.0.1:1", 31337, contract, paymentToken),
        webOrigin: "http://localhost:3040",
        production: false,
        operators: [],
      },
    });
    return createSpokeClient({
      baseUrl: "http://freshness.test",
      fetch: async (input, init) => await app.fetch(new Request(input, init)),
    });
  };

  it("ages the indexed block past fifteen seconds even when its cursor was just rewritten", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(checkpointTime);
    const checkpoint = {
      blockNumber: "10",
      indexedBlockAt: checkpointTime.toISOString(),
      indexedAt: checkpointTime.toISOString(),
      lagSeconds: 0,
      status: "live",
    };
    await database.store.put("indexer", "cursor", "system", checkpoint);
    const sdk = client();
    expect((await sdk.readEnvelope("products.categories", {})).indexingStatus).toBe("live");

    vi.setSystemTime(checkpointTime.getTime() + 15_000);
    expect((await sdk.readEnvelope("products.categories", {})).indexingStatus).toBe("live");

    vi.setSystemTime(checkpointTime.getTime() + 15_001);
    await database.store.put("indexer", "cursor", "system", {
      ...checkpoint,
      indexedAt: new Date().toISOString(),
    });
    expect((await database.store.require("indexer", "cursor")).updatedAt.getTime()).toBe(
      Date.now(),
    );
    const response = await sdk.readEnvelope("products.categories", {});
    expect(response.blockNumber).toBe("10");
    expect(response.indexingStatus).toBe("behind");
  });

  it("retains genuine backfill state instead of presenting it as live or behind", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(checkpointTime);
    await database.store.put("indexer", "cursor", "system", {
      blockNumber: "10",
      indexedBlockAt: checkpointTime.toISOString(),
      status: "syncing",
    });
    vi.setSystemTime(checkpointTime.getTime() + 60_000);
    expect((await client().readEnvelope("products.categories", {})).indexingStatus).toBe("syncing");
  });

  it.each([undefined, "invalid"])(
    "does not claim freshness when the indexed block timestamp is %s",
    async (indexedBlockAt) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(checkpointTime);
      await database.store.put("indexer", "cursor", "system", {
        blockNumber: "10",
        ...(indexedBlockAt === undefined ? {} : { indexedBlockAt }),
        status: "live",
      });
      expect((await client().readEnvelope("products.categories", {})).indexingStatus).toBe(
        "behind",
      );
    },
  );
});
