import { simulatePolicy, type ClientOutput, type CommissionPolicy } from "@spoke/protocol";

export type PolicyVersion = ClientOutput<"campaigns.policy">["current"];

export const toPolicy = (version: PolicyVersion): CommissionPolicy => ({
  rewardToken: version.rewardToken,
  commissionBps: version.commissionBps,
  perSaleCap: version.perSaleCap,
  campaignLiabilityCap: version.campaignLiabilityCap,
  maxRewardedAncestors: version.maxRewardedAncestors,
  weightsBps: version.weightsBps,
  shortPathMode: version.shortPathMode,
  holdSeconds: version.holdSeconds,
  expiry: version.expiry,
  eligibilityHash: version.eligibilityHash,
});

export const versionOf = (
  policy: ClientOutput<"campaigns.policy">,
  version: number,
): PolicyVersion | undefined =>
  [policy.current, ...policy.history, ...(policy.scheduled ? [policy.scheduled] : [])].find(
    (candidate) => candidate.version === version,
  );

export const splitNotes = (price: bigint, version: PolicyVersion, paidCount: number) => {
  const result = simulatePolicy(price, toPolicy(version), paidCount);
  const first = result.amounts[0] ?? 0n;
  const firstWeight = BigInt(result.weightsBps[0] ?? 0);
  const reward = result.reserved + result.unallocated;
  const remainder = paidCount > 0 ? first - (reward * firstWeight) / 10_000n : 0n;
  return {
    short: paidCount > 0 && paidCount < version.maxRewardedAncestors,
    weightsBps: result.weightsBps,
    returned: paidCount > 0 ? result.unallocated : 0n,
    remainder: remainder > 0n ? remainder : 0n,
  };
};
