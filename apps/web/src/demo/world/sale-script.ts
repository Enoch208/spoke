import { DAY, HOUR, MINUTE } from "./ids";

export type Outcome = "pending" | "finalized" | "refunded" | "reversed";

export interface ScriptedSale {
  campaign: number;
  node: string | null;
  at: number;
  outcome: Outcome;
  buyer?: "persona";
  tag?: string;
}

const inHold = (holdMs: number, remainingMs: number) => -holdMs + remainingMs;

export const scriptedSales: readonly ScriptedSale[] = [
  {
    campaign: 1,
    node: "mara",
    at: inHold(DAY, 5 * MINUTE),
    outcome: "pending",
    tag: "persona-at-risk",
  },
  { campaign: 1, node: "mara", at: -DAY - 2 * HOUR, outcome: "pending", tag: "persona-ready" },
  { campaign: 1, node: "aiko", at: -DAY - 40 * MINUTE, outcome: "pending", tag: "persona-ready" },
  { campaign: 1, node: "kofi", at: -12 * DAY, outcome: "finalized", tag: "outside-depth" },
  { campaign: 1, node: "moses", at: -8 * DAY, outcome: "finalized", tag: "not-on-path" },
  { campaign: 1, node: "tomas", at: -15 * DAY, outcome: "finalized", tag: "renormalized" },
  { campaign: 1, node: "oscar", at: -18 * DAY, outcome: "refunded", tag: "persona-refunded" },
  {
    campaign: 1,
    node: "priya",
    at: inHold(DAY, 3 * MINUTE),
    outcome: "pending",
    buyer: "persona",
    tag: "buyer-pending",
  },
  {
    campaign: 1,
    node: "ines",
    at: inHold(DAY, 50_000),
    outcome: "pending",
    tag: "refund-request-closing",
  },
  {
    campaign: 1,
    node: "daniel",
    at: inHold(DAY, 4 * MINUTE),
    outcome: "pending",
    tag: "refund-request",
  },
  { campaign: 1, node: "ben", at: inHold(DAY, 7 * MINUTE), outcome: "pending" },
  { campaign: 1, node: "grace", at: inHold(DAY, 11 * MINUTE), outcome: "pending" },
  { campaign: 1, node: null, at: inHold(DAY, 16 * MINUTE), outcome: "pending" },
  { campaign: 1, node: "zainab2", at: -20 * DAY, outcome: "finalized", tag: "repeated-wallet" },
  { campaign: 1, node: null, at: -25 * DAY, outcome: "finalized", tag: "direct" },
  { campaign: 6, node: "nnamdi", at: -9 * DAY, outcome: "finalized", tag: "return-unused" },
  { campaign: 6, node: "hana", at: -5 * DAY, outcome: "finalized" },
  { campaign: 6, node: "mara", at: -30 * MINUTE, outcome: "pending" },
  { campaign: 9, node: "mara", at: -30 * DAY, outcome: "reversed", tag: "reversed" },
  { campaign: 9, node: "elena", at: -40 * DAY, outcome: "finalized", tag: "attested" },
  {
    campaign: 4,
    node: "ben",
    at: -20 * DAY,
    outcome: "finalized",
    buyer: "persona",
    tag: "buyer-settled",
  },
  {
    campaign: 2,
    node: "fatima",
    at: -25 * DAY,
    outcome: "refunded",
    buyer: "persona",
    tag: "buyer-refunded",
  },
  {
    campaign: 3,
    node: "mara",
    at: -14 * DAY,
    outcome: "finalized",
    tag: "persona-ended-claimable",
  },
];

export const saleTargets: Readonly<Record<number, number>> = {
  1: 80,
  2: 25,
  3: 30,
  4: 20,
  5: 8,
  6: 14,
  8: 10,
  9: 13,
};

export const proceedsClaimDays: Readonly<Record<number, readonly number[]>> = {
  1: [60, 30, 6],
  2: [20],
  3: [40],
  4: [15],
  6: [10],
  8: [30],
  9: [20],
};

export const budgetHeadroom: Readonly<Record<number, readonly [whole: number, cents: number]>> = {
  1: [400, 0],
  2: [14, 0],
  3: [120, 0],
  4: [3, 0],
  5: [200, 0],
  6: [150, 0],
  8: [40, 0],
  9: [30, 0],
};

export const withdrawals: Readonly<Record<number, readonly [whole: number, daysAgo: number]>> = {
  3: [50, 8],
};

export const personaClaimDays = [60, 35, 12] as const;
