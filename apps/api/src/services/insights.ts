import { randomUUID } from "node:crypto";
import { distributorInsights, addressString } from "@spoke/protocol";
import { z } from "zod";
import type { Store } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { boundedText } from "../http/bounded.js";

const transfer = z.object({
  from_address: addressString,
  to_address: addressString,
  from_address_label: z.string().max(500).nullable().optional(),
  to_address_label: z.string().max(500).nullable().optional(),
});
const transactionsResponse = z.object({
  pagination: z.object({
    page: z.number().int().positive(),
    per_page: z.number().int().max(100),
    is_last_page: z.boolean(),
  }),
  data: z
    .array(
      z.object({
        chain: z.string().min(1).max(60),
        block_timestamp: z.string().transform((value) => new Date(value).toISOString()),
        transaction_hash: z.string().min(1).max(150),
        tokens_sent: z.array(transfer).optional(),
        tokens_received: z.array(transfer).optional(),
      }),
    )
    .max(100),
});
export const insightScope =
  "Public history on Nansen-supported mainnet networks for the same address; excludes Spoke's Monad Testnet settlement record. This is context for review, never a payout input, discovery ranking or trust score.";
export const emptyInsights = () =>
  distributorInsights.parse({
    status: "none",
    source: null,
    fetchedAt: null,
    labels: [],
    networks: [],
    scopeNote: insightScope,
    activitySummary: null,
    reviewSignals: [],
  });
export const normalizeInsights = (
  address: string,
  response: unknown,
  fetchedAt: string,
  from: string,
) => {
  const body = transactionsResponse.parse(response);
  const labels = new Set<string>();
  const networks = new Set<string>();
  let lastActiveAt: string | null = null;
  for (const tx of body.data) {
    networks.add(tx.chain);
    if (!lastActiveAt || tx.block_timestamp > lastActiveAt) lastActiveAt = tx.block_timestamp;
    for (const token of [...(tx.tokens_sent ?? []), ...(tx.tokens_received ?? [])]) {
      if (token.from_address.toLowerCase() === address.toLowerCase() && token.from_address_label)
        labels.add(token.from_address_label);
      if (token.to_address.toLowerCase() === address.toLowerCase() && token.to_address_label)
        labels.add(token.to_address_label);
    }
  }
  return distributorInsights.parse({
    status: body.data.length ? "available" : "no_history",
    source: "Nansen",
    fetchedAt,
    labels: [...labels],
    networks: [...networks],
    scopeNote: `${insightScope} Activity covers ${from} through ${fetchedAt}${body.pagination.is_last_page ? "." : "; only the latest 100 transactions were sampled, so the total is unavailable."} No history in this window does not establish a new or safe wallet.`,
    activitySummary: {
      transactions: body.pagination.is_last_page ? body.data.length : null,
      lastActiveAt,
    },
    reviewSignals: [...labels].map((label) => ({
      label,
      reason:
        "Returned by Nansen for this address in public transfer history. Review the label's context before collaboration.",
    })),
  });
};
export interface InsightsOptions {
  apiKey: string | null;
  demoAddresses: string[];
  budgetCredits: number;
  fetcher?: typeof fetch;
}
export const createInsightsService = (store: Store, options: InsightsOptions) => {
  const addresses = z
    .array(addressString)
    .max(10)
    .parse(options.demoAddresses)
    .map((value) => value.toLowerCase());
  const budgetCredits = z.number().int().min(0).max(100).parse(options.budgetCredits);
  const fetcher = options.fetcher ?? fetch;
  const read = async (address: string) => {
    const row = await store.get("insights", addressString.parse(address).toLowerCase());
    if (row) return distributorInsights.parse(row.payload);
    const failure = await store.get("insights-failure", address.toLowerCase());
    if (failure)
      throw new ApiProblem(
        503,
        "NANSEN_UNAVAILABLE",
        "Distributor insights are temporarily unavailable. Settlement and payouts are unaffected.",
        true,
        { status: "none" },
      );
    return emptyInsights();
  };
  const refresh = async (address: string) => {
    const normalized = addressString.parse(address).toLowerCase();
    if (!addresses.includes(normalized))
      throw new ApiProblem(
        403,
        "NOT_AUTHORIZED",
        "Insights refresh is limited to the configured demonstration distributors.",
      );
    if (!options.apiKey) return { status: "not_configured" as const };
    return store.exclusive("nansen-provider-budget", async () => {
      const cached = await store.get("insights", normalized);
      if (
        cached &&
        Date.now() - Date.parse(z.string().parse(cached.payload.fetchedAt)) < 86_400_000
      )
        return { status: "cached" as const };
      const day = new Date().toISOString().slice(0, 10);
      const refreshId = `${normalized}:${day}`;
      if (await store.get("insights-fetch", refreshId))
        return { status: "already_attempted" as const };
      const budget = await store.get("insights-budget", "nansen");
      const reserved = z
        .number()
        .int()
        .nonnegative()
        .parse(budget?.payload.reserved ?? 0);
      if (reserved + 10 > budgetCredits) return { status: "budget_exhausted" as const };
      await store.put("insights-budget", "nansen", "system", {
        reserved: reserved + 10,
        limit: budgetCredits,
      });
      const fetchedAt = new Date().toISOString();
      const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
      await store.put("insights-fetch", refreshId, "system", {
        address: normalized,
        state: "reserved",
        reservedCredits: 10,
        requestedAt: fetchedAt,
        requestId: randomUUID(),
      });
      try {
        const response = await fetcher(
          "https://api.nansen.ai/api/v1/profiler/address/transactions",
          {
            method: "POST",
            headers: { apikey: options.apiKey ?? "", "content-type": "application/json" },
            body: JSON.stringify({
              address: normalized,
              chain: "all",
              date: { from, to: fetchedAt },
              hide_spam_token: true,
              pagination: { page: 1, per_page: 100 },
              order_by: [{ field: "block_timestamp", direction: "DESC" }],
            }),
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (!response.ok)
          throw new ApiProblem(
            503,
            "NANSEN_UNAVAILABLE",
            "Nansen did not return distributor history.",
          );
        const text = await boundedText(response, 2_000_000);
        const result = normalizeInsights(normalized, JSON.parse(text), fetchedAt, from);
        const creditHeader = response.headers.get("x-nansen-credits-used");
        const usedCredits =
          creditHeader && /^\d+$/.test(creditHeader) ? Number(creditHeader) : null;
        await store.put("insights", normalized, "system", result);
        await store.put("insights-fetch", refreshId, "system", {
          address: normalized,
          state: "complete",
          reservedCredits: 10,
          usedCredits,
          fetchedAt,
        });
        await store.remove("insights-failure", normalized, "system");
        return { status: "refreshed" as const };
      } catch {
        await store.put("insights-failure", normalized, "system", {
          at: new Date().toISOString(),
          code: "NANSEN_UNAVAILABLE",
        });
        await store.put("insights-fetch", refreshId, "system", {
          address: normalized,
          state: "failed",
          reservedCredits: 10,
          fetchedAt,
        });
        return { status: "failed" as const };
      }
    });
  };
  return {
    read,
    refresh,
    async refreshConfigured() {
      const results = [];
      for (const address of addresses) results.push({ address, ...(await refresh(address)) });
      return results;
    },
  };
};
export type InsightsService = ReturnType<typeof createInsightsService>;
