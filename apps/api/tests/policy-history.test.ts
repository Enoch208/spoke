import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { clientMethodSchemas } from "@spoke/protocol";
import { createSpokeClient } from "../../../packages/sdk/src/index.js";
import { createApp } from "../src/app.js";
import { createChainService } from "../src/services/chain.js";
import { projectBatch } from "../src/services/indexing/projections.js";
import { sourceEvent } from "../src/services/indexing/source.js";
import { isolatedStore } from "./isolated-store.js";
import { contract, paymentToken, fixtureRpc } from "./indexing-fixture.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const hash = `0x${"01".repeat(32)}`;

describe.skipIf(!databaseUrl)("indexed policy history public transport", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  let rpc: Awaited<ReturnType<typeof fixtureRpc>>;
  beforeAll(async () => {
    database = await isolatedStore(databaseUrl ?? "", `policy_${randomUUID().replaceAll("-", "")}`);
    rpc = await fixtureRpc();
  });
  afterAll(async () => {
    await rpc.close();
    await database.close();
  });
  it("returns canonical history from actual indexed policy records through the public SDK", async () => {
    const { store } = database;
    const chain = createChainService(rpc.url, 31337, contract, paymentToken);
    const projected = await projectBatch(
      store,
      chain,
      [
        sourceEvent.parse({
          id: "policy-registration",
          chainId: 31337,
          txHash: hash,
          blockHash: hash,
          blockNumber: "3",
          logIndex: 0,
          name: "PolicyVersionRegistered",
          payload: { campaignId: "1", version: 1 },
          at: new Date(1000_000),
        }),
      ],
      10n,
      "envio",
    );
    for (const row of projected)
      await store.put(
        row.kind,
        row.id,
        row.owner,
        z.record(z.string(), z.unknown()).parse(row.payload),
      );
    expect((await store.require("policy-version", "1_1")).payload).toMatchObject({
      campaignId: "1",
      txHash: hash,
      blockNumber: "3",
      at: new Date(1000_000).toISOString(),
    });
    const app = createApp({
      webOrigin: "http://localhost:3040",
      probes: {
        database: () => store.health(),
        rpc: () => Promise.resolve("ok" as const),
      },
      config: { chainId: 31337, protocolAddress: contract },
      services: {
        store,
        chain,
        webOrigin: "http://localhost:3040",
        production: false,
        operators: [],
      },
    });
    const client = createSpokeClient({
      baseUrl: "http://policy.test",
      fetch: async (input, init) => await app.fetch(new Request(input, init)),
    });
    const result = await client.readEnvelope("campaigns.policy", { campaignId: "1" });
    expect(result.chainId).toBe(31337);
    expect(result.blockNumber).toBe("10");
    expect(clientMethodSchemas["campaigns.policy"].output.parse(result.data)).toEqual(result.data);
    expect(result.data.scheduled).toBeNull();
    expect(result.data.history).toEqual([result.data.current]);
    expect(result.data.history[0]).not.toHaveProperty("campaignId");
    expect(result.data.history[0]).not.toHaveProperty("txHash");
    expect(result.data.history[0]).not.toHaveProperty("blockNumber");
    expect(result.data.history[0]).not.toHaveProperty("at");
    expect((await store.require("policy-version", "1_1")).payload).toHaveProperty("txHash", hash);
    expect(rpc.state.errors).toEqual([]);
  });
});
