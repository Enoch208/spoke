import type { Address } from "viem";
import { DAY, demoId, iso } from "./ids";
import type { DemoCore } from "./types";
import type { DistributorInsights } from "./world";

export const INSIGHTS_SCOPE_NOTE =
  "Sample wallet context. Not real data and not from any provider.";
export const INSIGHTS_SOURCE = "Sample";

const NETWORKS = ["Sample Network A", "Sample Network B"];

type Signal = DistributorInsights["reviewSignals"][number];

interface InsightRow {
  distributor: number;
  labels: readonly string[];
  networks: number;
  transactions: number;
  lastActiveDaysAgo: number;
  fetchedDaysAgo: number;
  signal?: Signal;
}

const rows: readonly InsightRow[] = [
  {
    distributor: 1,
    labels: ["Sample · Long-time holder", "Sample · Newsletter publisher"],
    networks: 2,
    transactions: 412,
    lastActiveDaysAgo: 1,
    fetchedDaysAgo: 3,
  },
  {
    distributor: 2,
    labels: ["Sample · Developer wallet"],
    networks: 1,
    transactions: 188,
    lastActiveDaysAgo: 4,
    fetchedDaysAgo: 5,
  },
  {
    distributor: 3,
    labels: ["Sample · Design marketplace seller"],
    networks: 2,
    transactions: 96,
    lastActiveDaysAgo: 2,
    fetchedDaysAgo: 5,
  },
  {
    distributor: 5,
    labels: ["Sample · Research DAO voter", "Sample · Grant recipient"],
    networks: 2,
    transactions: 254,
    lastActiveDaysAgo: 6,
    fetchedDaysAgo: 7,
  },
  {
    distributor: 9,
    labels: ["Sample · Template creator"],
    networks: 1,
    transactions: 61,
    lastActiveDaysAgo: 11,
    fetchedDaysAgo: 12,
  },
  {
    distributor: 12,
    labels: ["Sample · Frequent swapper"],
    networks: 2,
    transactions: 530,
    lastActiveDaysAgo: 1,
    fetchedDaysAgo: 1,
    signal: {
      label: "Sample · Buyers funded by one address",
      reason:
        "Three sample buyer wallets that bought through this person's link were funded by the same address minutes before buying. Context for review only; it never changes a payout.",
    },
  },
  {
    distributor: 14,
    labels: ["Sample · New wallet"],
    networks: 1,
    transactions: 23,
    lastActiveDaysAgo: 3,
    fetchedDaysAgo: 4,
    signal: {
      label: "Sample · Refund-heavy branch",
      reason:
        "Three of five sample sales through this person's link in one campaign were refunded. Context for review only; it never changes a payout.",
    },
  },
  {
    distributor: 15,
    labels: ["Sample · Developer wallet"],
    networks: 2,
    transactions: 147,
    lastActiveDaysAgo: 2,
    fetchedDaysAgo: 2,
  },
  {
    distributor: 16,
    labels: ["Sample · Design community moderator"],
    networks: 1,
    transactions: 79,
    lastActiveDaysAgo: 9,
    fetchedDaysAgo: 10,
  },
  {
    distributor: 21,
    labels: ["Sample · Open-source contributor"],
    networks: 2,
    transactions: 302,
    lastActiveDaysAgo: 5,
    fetchedDaysAgo: 6,
  },
];

export const emptyInsights = (
  status: "none" | "no_history",
  fetchedAt: string | null,
): DistributorInsights => ({
  status,
  source: status === "none" ? null : INSIGHTS_SOURCE,
  fetchedAt,
  labels: [],
  networks: status === "none" ? [] : [...NETWORKS],
  scopeNote: INSIGHTS_SCOPE_NOTE,
  activitySummary: status === "none" ? null : { transactions: 0, lastActiveAt: null },
  reviewSignals: [],
});

const addressOf = (core: DemoCore, n: number): Address | undefined =>
  core.people.find((person) => person.id === demoId("u", n))?.addresses[0];

export const seedInsights = (core: DemoCore): Record<Address, DistributorInsights> => {
  const entries: [Address, DistributorInsights][] = [];
  for (const row of rows) {
    const address = addressOf(core, row.distributor);
    if (!address) continue;
    entries.push([
      address,
      {
        status: "available",
        source: INSIGHTS_SOURCE,
        fetchedAt: iso(core.anchor - row.fetchedDaysAgo * DAY),
        labels: [...row.labels],
        networks: NETWORKS.slice(0, row.networks),
        scopeNote: INSIGHTS_SCOPE_NOTE,
        activitySummary: {
          transactions: row.transactions,
          lastActiveAt: iso(core.anchor - row.lastActiveDaysAgo * DAY),
        },
        reviewSignals: row.signal ? [row.signal] : [],
      },
    ]);
  }
  const pseudonymous = addressOf(core, 4);
  const hidden = addressOf(core, 6);
  if (pseudonymous)
    entries.push([pseudonymous, emptyInsights("no_history", iso(core.anchor - 6 * DAY))]);
  if (hidden) entries.push([hidden, emptyInsights("none", null)]);
  return Object.fromEntries(entries);
};
