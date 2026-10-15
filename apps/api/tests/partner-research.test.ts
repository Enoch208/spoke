import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createInsightsService } from "../src/services/insights.js";
import { isolatedStore } from "./isolated-store.js";

const address = "0x0000000000000000000000000000000000000001";
const other = "0x0000000000000000000000000000000000000002";
const hash = `0x${"ab".repeat(32)}`;
const timestamp = "2026-10-01T00:00:00Z";
const page = { page: 1, per_page: 100, is_last_page: true };
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("partner research evidence and durable credit controls", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  beforeAll(async () => {
    database = await isolatedStore(url ?? "", `research_${randomUUID().replaceAll("-", "")}`);
  });
  afterAll(() => database.close());
  beforeEach(async () => {
    await database.store.db.execute(sql`truncate api_records`);
  });
  const setup = (
    overrides: { fail?: string; empty?: boolean; plan?: string; credits?: number } = {},
  ) => {
    const calls: { path: string; body: unknown }[] = [];
    const fetcher: typeof fetch = (input, init) => {
      const path =
        (typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
          .split("/")
          .at(-1) ?? "";
      calls.push({
        path,
        body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null,
      });
      if (overrides.fail === path || (overrides.fail === "all" && path !== "account"))
        return Promise.reject(new Error("Provider timeout"));
      const json =
        path === "account"
          ? { plan: overrides.plan ?? "free", credits_remaining: overrides.credits ?? 20 }
          : {
              pagination: page,
              data: overrides.empty
                ? []
                : path === "transactions"
                  ? [
                      {
                        chain: "ethereum",
                        block_timestamp: timestamp,
                        transaction_hash: hash,
                        tokens_sent: null,
                        tokens_received: null,
                      },
                    ]
                  : path === "first-funder"
                    ? [
                        {
                          wallet_address: address,
                          first_funder_address: other,
                          first_funder_name: "Example funder",
                          chain: "ethereum",
                          block_timestamp: timestamp,
                          transaction_hash: hash,
                        },
                      ]
                    : [
                        {
                          address: other,
                          address_label: null,
                          relation: "Common funder",
                          chain: "monad",
                          block_timestamp: timestamp,
                          transaction_hash: hash,
                          order: 1,
                        },
                      ],
            };
      return Promise.resolve(new Response(JSON.stringify(json)));
    };
    return {
      calls,
      service: createInsightsService(database.store, {
        apiKey: "test",
        budgetCredits: 9,
        demoAddresses: [],
        fetcher,
      }),
    };
  };
  it("uses supported endpoint bodies, normalizes nullable transfers and exposes inspectable evidence", async () => {
    const { service, calls } = setup();
    const result = await service.research(address, "merchant-1");
    expect(result.status).toBe("refreshed");
    expect(result.insights.research).toMatchObject({
      sampledTransactions: 1,
      truncated: false,
      transactions: [{ transactionHash: hash, chain: "ethereum" }],
      firstFunding: { address: other },
      relationships: [{ address: other, relation: "Common funder" }],
    });
    expect(calls.find((call) => call.path === "first-funder")?.body).toEqual({
      address,
      chain: "all",
    });
    expect(calls.find((call) => call.path === "related-wallets")?.body).toMatchObject({
      address,
      chain: "monad",
      pagination: { per_page: 20 },
    });
    expect((await service.read(address)).source).toBe("Nansen");
    expect((await service.research(address, "merchant-2")).status).toBe("cached");
    expect(calls).toHaveLength(4);
    expect((await database.store.require("insights-budget", "nansen")).payload.reserved).toBe(3);
  });
  it("keeps empty results distinct from endpoint failures and never invents wallet age", async () => {
    const { service } = setup({ empty: true, fail: "first-funder" });
    const result = await service.research(address, "merchant");
    expect(result.insights.status).toBe("no_history");
    expect(result.insights.research?.firstFunding).toBeNull();
    expect(result.insights.research?.endpoints.map((row) => row.state)).toEqual([
      "empty",
      "unavailable",
      "empty",
    ]);
    expect(result.insights).not.toHaveProperty("walletAge");
  });
  it("does not retry uncertain requests after restart and keeps existing research", async () => {
    const { service, calls } = setup({ fail: "all" });
    expect((await service.research(address, "merchant")).status).toBe("failed");
    expect((await setup().service.research(address, "merchant")).status).toBe("already_attempted");
    expect(calls).toHaveLength(4);
    expect((await database.store.require("insights-budget", "nansen")).payload.reserved).toBe(3);
  });
  it("preflights provider credits without attempting paid endpoints or buying credits", async () => {
    for (const overrides of [{ plan: "pro" }, { credits: 2 }, { fail: "account" }]) {
      const { service, calls } = setup(overrides);
      expect((await service.research(address, "merchant")).status).toBe(
        overrides.fail ? "failed" : "budget_exhausted",
      );
      expect(calls.map((call) => call.path)).toEqual(["account"]);
    }
    expect(await database.store.get("insights-budget", "nansen")).toBeUndefined();
  });
  it("retains historical reservations and limits fresh lookups per merchant", async () => {
    const { service, calls } = setup({ empty: true });
    await service.research(address, "merchant");
    await service.research(other, "merchant");
    expect((await service.research(`0x${"03".repeat(20)}`, "merchant")).status).toBe(
      "budget_exhausted",
    );
    expect(calls).toHaveLength(8);
    await database.store.put("insights-budget", "nansen", "system", { reserved: 9 });
    expect((await service.research(`0x${"04".repeat(20)}`, "another")).status).toBe(
      "budget_exhausted",
    );
    expect(calls).toHaveLength(8);
  });
  it("serializes concurrent requests across merchants so the same wallet is fetched once", async () => {
    const { service, calls } = setup();
    const results = await Promise.allSettled([
      service.research(address, "a"),
      service.research(address, "b"),
    ]);
    expect(
      results.some((row) => row.status === "fulfilled" && row.value.status === "refreshed"),
    ).toBe(true);
    expect(calls).toHaveLength(4);
  });
});
