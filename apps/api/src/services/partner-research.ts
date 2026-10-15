import { nansenTimestamp } from "./nansen-timestamp.js";
import { addressString, distributorInsights } from "@spoke/protocol";
import { z } from "zod";
import type { Store } from "../db/store.js";
import { boundedText } from "../http/bounded.js";
import { emptyInsights, normalizeInsights, type InsightsOptions } from "./insights.js";

const evidence = z.object({
  chain: z.string().min(1).max(60),
  transaction_hash: z.string().min(1).max(150),
  block_timestamp: nansenTimestamp,
});
const funders = z.object({
  data: z
    .array(
      evidence.extend({
        wallet_address: addressString,
        first_funder_address: addressString,
        first_funder_name: z.string().max(500).nullish(),
      }),
    )
    .max(100),
});
const relationships = z.object({
  data: z
    .array(
      evidence.extend({
        address: addressString,
        address_label: z.string().max(500).nullish(),
        relation: z.string().max(500),
      }),
    )
    .max(100),
});
const credits = 3;
const dailyLimit = 9;
const sources = {
  transactions: "https://docs.nansen.ai/api/profiler/address-transactions",
  "first-funder": "https://docs.nansen.ai/api/profiler/address-first-funder",
  "related-wallets": "https://docs.nansen.ai/api/profiler/address-related-wallets",
} as const;
const proof = (row: z.infer<typeof evidence>) => ({
  chain: row.chain,
  transactionHash: row.transaction_hash,
  timestamp: new Date(row.block_timestamp).toISOString(),
});

export const createPartnerResearch = (store: Store, options: InsightsOptions) => {
  const fetcher = options.fetcher ?? fetch;
  return async (address: string, requester: string) =>
    store.exclusive("nansen-provider-budget", async () => {
      const normalized = addressString.parse(address).toLowerCase();
      const cached = await store.get("insights", normalized);
      const previous = cached ? distributorInsights.parse(cached.payload) : emptyInsights();
      const result = (
        status:
          | "refreshed"
          | "cached"
          | "already_attempted"
          | "budget_exhausted"
          | "not_configured"
          | "failed",
        insights = previous,
      ) => ({ status, insights });
      if (!options.apiKey) return result("not_configured");
      if (
        previous.research?.endpoints.length === 3 &&
        previous.fetchedAt &&
        Date.now() - Date.parse(previous.fetchedAt) < 86_400_000
      )
        return result("cached");
      const day = new Date().toISOString().slice(0, 10);
      const attemptId = `${normalized}:${day}`;
      if (await store.get("partner-research-attempt", attemptId))
        return result("already_attempted");
      const budget = await store.get("insights-budget", "nansen");
      const daily = await store.get("partner-research-budget", day);
      const merchant = await store.get("partner-research-merchant", `${requester}:${day}`);
      const count = (value: unknown) =>
        z
          .number()
          .int()
          .nonnegative()
          .parse(value ?? 0);
      const reserved = count(budget?.payload.reserved);
      const today = count(daily?.payload.reserved);
      const requests = count(merchant?.payload.requests);
      if (
        reserved + credits > options.budgetCredits ||
        today + credits > dailyLimit ||
        requests >= 2
      )
        return result("budget_exhausted");
      const request = async (path: string, body?: object) => {
        const response = await fetcher(`https://api.nansen.ai/api/v1/${path}`, {
          method: body ? "POST" : "GET",
          headers: { apikey: options.apiKey ?? "", "content-type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(7_000),
        });
        if (!response.ok) throw new Error("Provider unavailable");
        return JSON.parse(await boundedText(response, 2_000_000)) as unknown;
      };
      try {
        const account = z
          .object({ plan: z.string(), credits_remaining: z.number().nonnegative() })
          .parse(await request("account"));
        if (account.plan !== "free" || account.credits_remaining < credits)
          return result("budget_exhausted");
      } catch {
        return result("failed");
      }
      const fetchedAt = new Date().toISOString();
      const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
      await store.put("insights-budget", "nansen", "system", {
        reserved: reserved + credits,
        limit: options.budgetCredits,
      });
      await store.put("partner-research-budget", day, "system", { reserved: today + credits });
      await store.put("partner-research-merchant", `${requester}:${day}`, requester, {
        requests: requests + 1,
      });
      await store.put("partner-research-attempt", attemptId, "system", {
        state: "reserved",
        reservedCredits: credits,
        fetchedAt,
      });
      const responses = await Promise.allSettled([
        request("profiler/address/transactions", {
          address: normalized,
          chain: "all",
          date: { from, to: fetchedAt },
          hide_spam_token: true,
          pagination: { page: 1, per_page: 100 },
          order_by: [{ field: "block_timestamp", direction: "DESC" }],
        }).then((value) => normalizeInsights(normalized, value, fetchedAt, from)),
        request("profiler/address/first-funder", { address: normalized, chain: "all" }).then(
          (value) =>
            funders
              .parse(value)
              .data.filter((row) => row.wallet_address.toLowerCase() === normalized)
              .sort((a, b) => Date.parse(a.block_timestamp) - Date.parse(b.block_timestamp))[0] ??
            null,
        ),
        request("profiler/address/related-wallets", {
          address: normalized,
          chain: "monad",
          pagination: { page: 1, per_page: 20 },
          order_by: [{ field: "order", direction: "ASC" }],
        }).then((value) =>
          relationships
            .parse(value)
            .data.filter((row) => row.chain === "monad")
            .slice(0, 20),
        ),
      ]);
      const [transactions, first, related] = responses;
      const base =
        transactions.status === "fulfilled"
          ? transactions.value
          : { ...emptyInsights(), source: "Nansen", fetchedAt };
      const firstFunding =
        first.status === "fulfilled" && first.value
          ? {
              ...proof(first.value),
              address: first.value.first_funder_address,
              label: first.value.first_funder_name ?? null,
            }
          : null;
      const relatedRows =
        related.status === "fulfilled"
          ? related.value.map((row) => ({
              ...proof(row),
              address: row.address,
              label: row.address_label ?? null,
              relation: row.relation,
            }))
          : [];
      const state = (index: number, count: number) =>
        responses[index]?.status !== "fulfilled"
          ? ("unavailable" as const)
          : count
            ? ("available" as const)
            : ("empty" as const);
      const allFailed = responses.every((response) => response.status === "rejected");
      const insights = distributorInsights.parse({
        ...base,
        status: firstFunding || relatedRows.length ? "available" : base.status,
        research: {
          window: { from, to: fetchedAt },
          sampledTransactions: base.research?.sampledTransactions ?? 0,
          truncated: base.research?.truncated ?? false,
          transactions: base.research?.transactions ?? [],
          firstFunding,
          relationships: relatedRows,
          relationshipChain: "monad",
          endpoints: (Object.keys(sources) as (keyof typeof sources)[]).map((endpoint, index) => ({
            endpoint,
            state: state(
              index,
              index === 0
                ? (base.research?.sampledTransactions ?? 0)
                : index === 1
                  ? Number(Boolean(firstFunding))
                  : relatedRows.length,
            ),
            fetchedAt,
            sourceUrl: sources[endpoint],
          })),
        },
      });
      await store.put("partner-research-attempt", attemptId, "system", {
        state: allFailed ? "failed" : "complete",
        reservedCredits: credits,
        fetchedAt,
      });
      if (allFailed) return result("failed");
      await store.put("insights", normalized, "system", insights);
      await store.remove("insights-failure", normalized, "system");
      return result("refreshed", insights);
    });
};
