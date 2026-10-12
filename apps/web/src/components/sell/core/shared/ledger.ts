import type { ClientOutput } from "@spoke/protocol";

export type VaultLedger = ClientOutput<"vault.get">;
export type VaultCampaign = VaultLedger["campaigns"][number];
type RewardWire = VaultCampaign["rewards"];
type ProceedsWire = VaultCampaign["proceeds"];

export const rewardKeys = [
  "available",
  "pendingReserved",
  "vestedUnclaimed",
  "rewardsClaimed",
  "surplusWithdrawn",
] as const;
export type RewardKey = (typeof rewardKeys)[number];

export const proceedsKeys = [
  "proceedsPending",
  "proceedsClaimable",
  "proceedsClaimed",
  "buyerRefunded",
] as const;
export type ProceedsKey = (typeof proceedsKeys)[number];

export type RewardBuckets = Record<RewardKey | "netDeposited", bigint>;
export type ProceedsBuckets = Record<ProceedsKey, bigint>;

export const rewardBuckets = (wire: RewardWire): RewardBuckets => ({
  netDeposited: BigInt(wire.netDeposited),
  available: BigInt(wire.available),
  pendingReserved: BigInt(wire.pendingReserved),
  vestedUnclaimed: BigInt(wire.vestedUnclaimed),
  rewardsClaimed: BigInt(wire.rewardsClaimed),
  surplusWithdrawn: BigInt(wire.surplusWithdrawn),
});

export const proceedsBuckets = (wire: ProceedsWire): ProceedsBuckets => ({
  proceedsPending: BigInt(wire.proceedsPending),
  proceedsClaimable: BigInt(wire.proceedsClaimable),
  proceedsClaimed: BigInt(wire.proceedsClaimed),
  buyerRefunded: BigInt(wire.buyerRefunded),
});

const total = (values: readonly bigint[]) => values.reduce((sum, value) => sum + value, 0n);

export const rewardSum = (buckets: RewardBuckets) => total(rewardKeys.map((key) => buckets[key]));

export const rewardsAddUp = (buckets: RewardBuckets) => rewardSum(buckets) === buckets.netDeposited;

export const proceedsTotal = (buckets: ProceedsBuckets) =>
  total(proceedsKeys.map((key) => buckets[key]));

export const committed = (buckets: RewardBuckets) =>
  buckets.pendingReserved + buckets.vestedUnclaimed + buckets.rewardsClaimed;

export const obligations = (buckets: RewardBuckets) =>
  buckets.pendingReserved + buckets.vestedUnclaimed;

export const roomUnderLimit = (liabilityCap: bigint, buckets: RewardBuckets) => {
  const room = liabilityCap - committed(buckets) - buckets.available;
  return room > 0n ? room : 0n;
};

export const fullRewardsCovered = (available: bigint, rewardPerSale: bigint) =>
  rewardPerSale > 0n ? available / rewardPerSale : null;

export const isExhausted = (available: bigint, rewardPerSale: bigint) =>
  rewardPerSale > 0n && available < rewardPerSale;

export const isLowBudget = (available: bigint, rewardPerSale: bigint, alertSales: number) => {
  const covered = fullRewardsCovered(available, rewardPerSale);
  return covered !== null && covered > 0n && covered < BigInt(alertSales);
};

export const shareOf = (part: bigint, whole: bigint) =>
  whole > 0n ? Number((part * 10_000n) / whole) / 100 : 0;
