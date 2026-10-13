import type { CampaignStateKey } from "@/lib/copy";
import { fullRewardsCovered, isExhausted, isLowBudget } from "../shared/ledger";

export type SettledTotals = { value: bigint; rewards: bigint };

export const netValue = (totals: SettledTotals) => totals.value - totals.rewards;

export const rewardCostBps = (totals: SettledTotals) =>
  totals.value > 0n ? Number((totals.rewards * 10_000n) / totals.value) : null;

export type HealthRow = {
  stateKey: CampaignStateKey;
  available: bigint;
  rewardPerSale: bigint;
  alertSales: number;
};

const counted = new Set<CampaignStateKey>(["live", "exhausted"]);

export const budgetHealth = (rows: readonly HealthRow[]) => {
  const live = rows.filter((row) => counted.has(row.stateKey));
  const available = live.reduce((sum, row) => sum + row.available, 0n);
  const covered = live
    .map((row) => fullRewardsCovered(row.available, row.rewardPerSale))
    .filter((value) => value !== null);
  const lowest = covered.length
    ? covered.reduce((min, value) => (value < min ? value : min))
    : null;
  const exhausted = live.filter((row) => isExhausted(row.available, row.rewardPerSale)).length;
  const low = live.filter((row) =>
    isLowBudget(row.available, row.rewardPerSale, row.alertSales),
  ).length;
  return { available, lowest, exhausted, low, liveCount: live.length };
};
