import type { Address } from "viem";

export const BPS_DENOMINATOR = 10_000n;

export const distributorRoles = ["nearest", "parent", "grandparent"] as const;
export type DistributorRole = (typeof distributorRoles)[number];

export type RecipientCount = 1 | 2 | 3;

export const splitBps: Readonly<Record<RecipientCount, readonly bigint[]>> = {
  1: [10_000n],
  2: [7_500n, 2_500n],
  3: [6_000n, 2_500n, 1_500n],
};

export const isRecipientCount = (count: number): count is RecipientCount =>
  count === 1 || count === 2 || count === 3;

export const computeReward = (
  priceMinor: bigint,
  commissionBps: number,
  maxCommissionPerSaleMinor: bigint,
): bigint => {
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
    throw new RangeError(
      `commissionBps must be an integer in 0..10000, got ${String(commissionBps)}`,
    );
  }
  if (priceMinor < 0n || maxCommissionPerSaleMinor < 0n) {
    throw new RangeError("Amounts must be non-negative");
  }
  const gross = (priceMinor * BigInt(commissionBps)) / BPS_DENOMINATOR;
  return gross < maxCommissionPerSaleMinor ? gross : maxCommissionPerSaleMinor;
};

export const splitReward = (rewardMinor: bigint, recipientCount: RecipientCount): bigint[] => {
  if (rewardMinor < 0n) throw new RangeError("Reward must be non-negative");
  const shares = splitBps[recipientCount];
  const ancestorAmounts = shares.slice(1).map((bps) => (rewardMinor * bps) / BPS_DENOMINATOR);
  const ancestorTotal = ancestorAmounts.reduce((sum, amount) => sum + amount, 0n);
  return [rewardMinor - ancestorTotal, ...ancestorAmounts];
};

export interface Allocation {
  recipient: Address;
  role: DistributorRole;
  depth: number;
  amountMinor: bigint;
}

export const allocateReward = (
  rewardMinor: bigint,
  nearestFirstRecipients: readonly Address[],
): Allocation[] => {
  const count = nearestFirstRecipients.length;
  if (!isRecipientCount(count)) {
    throw new RangeError(`Between 1 and 3 recipients are required, got ${String(count)}`);
  }
  const amounts = splitReward(rewardMinor, count);
  return nearestFirstRecipients.map((recipient, depth) => ({
    recipient,
    role: distributorRoles[depth] ?? "grandparent",
    depth,
    amountMinor: amounts[depth] ?? 0n,
  }));
};
