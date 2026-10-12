import type { Address } from "viem";

export const BPS_DENOMINATOR = 10_000n;
export const distributorRoles = ["nearest", "parent", "grandparent", "ancestor"] as const;
export type DistributorRole = (typeof distributorRoles)[number];
export type RecipientCount = 1 | 2 | 3 | 4 | 5;
export const isRecipientCount = (count: number): count is RecipientCount =>
  Number.isInteger(count) && count >= 1 && count <= 5;

export const computeReward = (
  priceMinor: bigint,
  commissionBps: number,
  perSaleCap: bigint,
): bigint => {
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000)
    throw new RangeError("Commission must be an integer in 0..10000.");
  if (priceMinor < 0n || perSaleCap < 0n) throw new RangeError("Amounts must be non-negative.");
  const gross = (priceMinor * BigInt(commissionBps)) / BPS_DENOMINATOR;
  return gross < perSaleCap ? gross : perSaleCap;
};

export const splitReward = (reward: bigint, weightsBps: readonly number[]): bigint[] => {
  if (
    reward < 0n ||
    !isRecipientCount(weightsBps.length) ||
    weightsBps.some((weight) => !Number.isInteger(weight) || weight <= 0) ||
    weightsBps.reduce((sum, weight) => sum + weight, 0) !== 10_000
  )
    throw new RangeError("Provide a valid normalized policy weight vector.");
  const rest = weightsBps.slice(1).map((weight) => (reward * BigInt(weight)) / BPS_DENOMINATOR);
  return [reward - rest.reduce((sum, amount) => sum + amount, 0n), ...rest];
};

export interface Allocation {
  recipient: Address;
  role: DistributorRole;
  depth: number;
  effectiveWeightBps: number;
  amountMinor: bigint;
}
export const allocateReward = (
  reward: bigint,
  recipients: readonly Address[],
  weightsBps: readonly number[],
): Allocation[] => {
  if (
    recipients.length !== weightsBps.length ||
    new Set(recipients.map((address) => address.toLowerCase())).size !== recipients.length
  )
    throw new RangeError("Policy must match distinct recipients.");
  const amounts = splitReward(reward, weightsBps);
  return recipients.map((recipient, depth) => ({
    recipient,
    role: distributorRoles[depth] ?? "ancestor",
    depth,
    effectiveWeightBps: weightsBps[depth] ?? 0,
    amountMinor: amounts[depth] ?? 0n,
  }));
};
