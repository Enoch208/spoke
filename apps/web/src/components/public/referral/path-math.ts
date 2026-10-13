import type { ClientOutput, CommissionPolicy } from "@spoke/protocol";
import { splitAtPrice } from "../shared/policy-math";

export type PathEntry = ClientOutput<"links.resolveCode">["eligiblePath"][number];

export type PathRow = { entry: PathEntry; level: number; weight: number; amount: bigint };

export const eligibleEntries = (path: readonly PathEntry[], max: number) =>
  path.filter((entry) => !entry.repeatedWallet).slice(0, max);

export const pathSplit = (price: bigint, policy: CommissionPolicy, path: readonly PathEntry[]) => {
  const eligible = eligibleEntries(path, policy.maxRewardedAncestors);
  const split = splitAtPrice(price, policy, eligible.length);
  const rows: PathRow[] = eligible.map((entry, index) => ({
    entry,
    level: index + 1,
    weight: split.weightsBps[index] ?? 0,
    amount: split.amounts[index] ?? 0n,
  }));
  return {
    rows,
    reserved: split.reserved,
    returned: split.unallocated,
    weightsBps: split.weightsBps,
    outside: path.filter((entry) => !entry.repeatedWallet).slice(policy.maxRewardedAncestors),
    repeated: path.filter((entry) => entry.repeatedWallet),
    short: eligible.length < policy.maxRewardedAncestors,
  };
};

export const projectionSplit = (
  price: bigint,
  policy: CommissionPolicy,
  path: readonly PathEntry[],
) => {
  const above = path.filter((entry) => !entry.repeatedWallet);
  const kept = above.slice(0, policy.maxRewardedAncestors - 1);
  const split = splitAtPrice(price, policy, kept.length + 1);
  return {
    viewer: { weight: split.weightsBps[0] ?? 0, amount: split.amounts[0] ?? 0n },
    rows: kept.map((entry, index) => ({
      entry,
      level: index + 2,
      weight: split.weightsBps[index + 1] ?? 0,
      amount: split.amounts[index + 1] ?? 0n,
    })),
    dropped: above[policy.maxRewardedAncestors - 1] ?? null,
  };
};
