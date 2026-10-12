import { computeReward, simulatePolicy, type CommissionPolicy } from "@spoke/protocol";
import { zeroHash } from "viem";

export const commissionPolicyOf = (policy: CommissionPolicy): CommissionPolicy => ({
  rewardToken: policy.rewardToken,
  commissionBps: policy.commissionBps,
  perSaleCap: policy.perSaleCap,
  campaignLiabilityCap: policy.campaignLiabilityCap,
  maxRewardedAncestors: policy.maxRewardedAncestors,
  weightsBps: policy.weightsBps,
  shortPathMode: policy.shortPathMode,
  holdSeconds: policy.holdSeconds,
  expiry: policy.expiry,
  eligibilityHash: policy.eligibilityHash,
});

export const rewardAtPrice = (price: bigint, policy: CommissionPolicy) =>
  computeReward(price, policy.commissionBps, BigInt(policy.perSaleCap));

export const uncappedReward = (price: bigint, policy: CommissionPolicy) =>
  computeReward(price, policy.commissionBps, price);

export const isCapped = (price: bigint, policy: CommissionPolicy) =>
  rewardAtPrice(price, policy) < uncappedReward(price, policy);

export const splitAtPrice = (
  price: bigint,
  policy: CommissionPolicy,
  pathLength: number = policy.maxRewardedAncestors,
) => simulatePolicy(price, commissionPolicyOf(policy), pathLength);

export const nearestShare = (price: bigint, policy: CommissionPolicy) =>
  splitAtPrice(price, policy).amounts[0] ?? 0n;

export const salesLeft = (available: bigint, reward: bigint) =>
  reward > 0n ? available / reward : 0n;

export const isInvitationOnly = (policy: Pick<CommissionPolicy, "eligibilityHash">) =>
  policy.eligibilityHash !== zeroHash;

export const expiryDate = (policy: Pick<CommissionPolicy, "expiry">) =>
  new Date(Number(policy.expiry) * 1000);

const endingSoonMs = 48 * 3600 * 1000;

export const endsSoon = (endsAt: Date, now: Date) => {
  const left = endsAt.getTime() - now.getTime();
  return left > 0 && left < endingSoonMs;
};
