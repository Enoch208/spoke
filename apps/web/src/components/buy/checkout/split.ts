import { simulatePolicy, type ClientOutput, type CommissionPolicy } from "@spoke/protocol";

type Preview = ClientOutput<"checkout.preview">;

const policyOnly = (policy: CommissionPolicy): CommissionPolicy => ({
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

export const splitMatches = (
  preview: Preview,
  policy: CommissionPolicy & { policyHash: string },
): boolean => {
  if (preview.policyHash !== policy.policyHash) return true;
  if (preview.recipients.length === 0) return BigInt(preview.rewardTotal) === 0n;
  const expected = simulatePolicy(
    BigInt(preview.price),
    policyOnly(policy),
    preview.recipients.length,
  );
  return (
    expected.reserved === BigInt(preview.rewardTotal) &&
    preview.recipients.every((recipient, index) => {
      const amount = expected.amounts[index];
      return amount !== undefined && amount === BigInt(recipient.amount);
    })
  );
};

export const sameTerms = (reviewed: Preview, fresh: Preview) =>
  reviewed.price === fresh.price &&
  reviewed.policyHash === fresh.policyHash &&
  reviewed.recipients.length === fresh.recipients.length &&
  reviewed.recipients.every((recipient, index) => {
    const other = fresh.recipients[index];
    return (
      other !== undefined &&
      other.nodeId === recipient.nodeId &&
      other.amount === recipient.amount &&
      other.effectiveWeightBps === recipient.effectiveWeightBps
    );
  });

export type SplitSentence =
  | { kind: "full"; split: readonly number[] }
  | { kind: "renormalized"; split: readonly number[] }
  | { kind: "returned"; split: readonly number[]; unallocated: bigint };

export const splitSentence = (
  preview: Preview,
  policy: Pick<CommissionPolicy, "maxRewardedAncestors" | "shortPathMode">,
): SplitSentence | null => {
  const count = preview.recipients.length;
  if (count === 0) return null;
  const split = preview.recipients.map((recipient) => recipient.effectiveWeightBps);
  if (count >= policy.maxRewardedAncestors) return { kind: "full", split };
  if (policy.shortPathMode === "RETURN_UNUSED")
    return { kind: "returned", split, unallocated: BigInt(preview.unallocated) };
  return { kind: "renormalized", split };
};
