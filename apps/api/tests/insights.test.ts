import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { normalizeInsights, createInsightsService } from "../src/services/insights.js";
import { isolatedStore } from "./isolated-store.js";

const address = "0x0000000000000000000000000000000000000001";
const other = "0x0000000000000000000000000000000000000002";
const empty = { pagination: { page: 1, per_page: 100, is_last_page: true }, data: [] };
const fetchedAt = "2026-10-12T20:00:00.000Z";
const from = "2026-09-12T20:00:00.000Z";

describe("distributor insight semantics", () => {
  it("labels only the requested wallet and avoids pretending a sampled page is a total", () => {
    const result = normalizeInsights(
      address,
      {
        pagination: { page: 1, per_page: 100, is_last_page: false },
        data: [
          {
            chain: "ethereum",
            block_timestamp: "2026-10-01T00:00:00Z",
            transaction_hash: "0x01",
            tokens_sent: [
              {
                from_address: address,
                to_address: other,
                from_address_label: "Entity label",
                to_address_label: "Counterparty label",
              },
            ],
          },
        ],
      },
      fetchedAt,
      from,
    );
    expect(result.labels).toEqual(["Entity label"]);
    expect(result.activitySummary).toEqual({
      transactions: null,
      lastActiveAt: "2026-10-01T00:00:00.000Z",
    });
    expect(result.scopeNote).toContain("excludes Spoke's Monad Testnet");
    expect(result.scopeNote).toContain("latest 100");
  });
  it("presents a real empty history window without a safety judgment", () => {
    const result = normalizeInsights(address, empty, fetchedAt, from);
    expect(result).toMatchObject({
      status: "no_history",
      labels: [],
      activitySummary: { transactions: 0, lastActiveAt: null },
    });
    expect(result.scopeNote).toContain("does not establish a new or safe wallet");
  });
});
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("durable insight budget and caching", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  beforeAll(async () => {
    database = await isolatedStore(url ?? "", `insights_${randomUUID().replaceAll("-", "")}`);
  });
  afterAll(() => database.close());
  beforeEach(async () => {
    await database.store.db.execute(sql`truncate api_records`);
  });
  const options = { apiKey: "test-key", demoAddresses: [address, other], budgetCredits: 10 };
  it("serves reads from cache only and persists the credit cap across service restarts", async () => {
    let calls = 0;
    const fetcher: typeof fetch = () => {
      calls++;
      return Promise.resolve(
        new Response(JSON.stringify(empty), { headers: { "x-nansen-credits-used": "1" } }),
      );
    };
    const insights = createInsightsService(database.store, { ...options, fetcher });
    expect(await insights.read(address)).toMatchObject({ status: "none" });
    expect(calls).toBe(0);
    expect(await insights.refresh(address)).toEqual({ status: "refreshed" });
    expect(await insights.read(address)).toMatchObject({ status: "no_history", source: "Nansen" });
    const restarted = createInsightsService(database.store, { ...options, fetcher });
    expect(await restarted.refresh(address)).toEqual({ status: "cached" });
    expect(await restarted.refresh(other)).toEqual({ status: "budget_exhausted" });
    expect(calls).toBe(1);
    expect((await database.store.require("insights-budget", "nansen")).payload.reserved).toBe(10);
  });
  it("does not retry an uncertain outgoing provider request after restart", async () => {
    let calls = 0;
    const fetcher: typeof fetch = () => {
      calls++;
      return Promise.reject(new Error("provider unavailable"));
    };
    const insights = createInsightsService(database.store, { ...options, fetcher });
    expect(await insights.refresh(address)).toEqual({ status: "failed" });
    const restarted = createInsightsService(database.store, { ...options, fetcher });
    expect(await restarted.refresh(address)).toEqual({ status: "already_attempted" });
    await expect(restarted.read(address)).rejects.toMatchObject({ code: "NANSEN_UNAVAILABLE" });
    expect(calls).toBe(1);
  });
  it("serializes callers globally and refuses unconfigured wallets", async () => {
    let calls = 0;
    const fetcher: typeof fetch = () => {
      calls++;
      return Promise.resolve(new Response(JSON.stringify(empty)));
    };
    const insights = createInsightsService(database.store, {
      ...options,
      budgetCredits: 20,
      fetcher,
    });
    const outcomes = await Promise.allSettled([
      insights.refresh(address),
      insights.refresh(address),
    ]);
    expect(outcomes.some((result) => result.status === "fulfilled")).toBe(true);
    expect(calls).toBe(1);
    expect((await database.store.require("insights-budget", "nansen")).payload.reserved).toBe(10);
    await expect(
      insights.refresh("0x0000000000000000000000000000000000000003"),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
    expect(calls).toBe(1);
  });
});
