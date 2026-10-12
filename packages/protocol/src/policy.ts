import { z } from "zod";
import { encodeAbiParameters, keccak256 } from "viem";
import { addressString, bytes32String, uintString } from "./api/common";
import { computeReward } from "./economics";

export const shortPathModes = ["RENORMALIZE_EXISTING", "RETURN_UNUSED"] as const;
export const commissionPolicy = z
  .strictObject({
    rewardToken: addressString,
    commissionBps: z.number().int().min(1).max(10_000),
    perSaleCap: uintString,
    campaignLiabilityCap: uintString,
    maxRewardedAncestors: z.number().int().min(1).max(5),
    weightsBps: z.array(z.number().int().min(1).max(10_000)).min(1).max(5),
    shortPathMode: z.enum(shortPathModes).default("RENORMALIZE_EXISTING"),
    holdSeconds: z.number().int().min(60).max(7_776_000),
    expiry: uintString,
    eligibilityHash: bytes32String,
  })
  .superRefine((policy, ctx) => {
    if (
      [policy.perSaleCap, policy.campaignLiabilityCap, policy.expiry].some(
        (value) => !uintString.safeParse(value).success,
      )
    )
      return;
    if (
      policy.weightsBps.length !== policy.maxRewardedAncestors ||
      policy.weightsBps.reduce((a, b) => a + b, 0) !== 10_000
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Weights must match the level count and sum to 10000.",
        path: ["weightsBps"],
      });
    }
    if (BigInt(policy.perSaleCap) > BigInt(policy.campaignLiabilityCap)) {
      ctx.addIssue({
        code: "custom",
        message: "Per-sale cap exceeds campaign liability cap.",
        path: ["perSaleCap"],
      });
    }
    if (
      [policy.perSaleCap, policy.campaignLiabilityCap].some(
        (value) => BigInt(value) >= 2n ** 256n,
      ) ||
      BigInt(policy.expiry) >= 2n ** 64n
    ) {
      ctx.addIssue({ code: "custom", message: "Policy integer exceeds its onchain range." });
    }
  });
export type CommissionPolicy = z.infer<typeof commissionPolicy>;

export const normalizeWeights = (weights: readonly number[]): number[] => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!total || weights.some((weight) => !Number.isInteger(weight) || weight <= 0))
    throw new RangeError("Invalid policy weights.");
  const rest = weights.slice(1).map((weight) => Math.floor((weight * 10_000) / total));
  return [10_000 - rest.reduce((sum, weight) => sum + weight, 0), ...rest];
};

export const allocatePolicyReward = (
  reward: bigint,
  policy: CommissionPolicy,
  pathLength: number,
) => {
  commissionPolicy.parse(policy);
  if (reward < 0n || !Number.isInteger(pathLength) || pathLength < 0)
    throw new RangeError("Invalid allocation input.");
  const eligible = policy.weightsBps.slice(0, pathLength);
  if (!eligible.length) return { amounts: [], weightsBps: [], reserved: 0n, unallocated: reward };
  const weights =
    policy.shortPathMode === "RENORMALIZE_EXISTING" ? normalizeWeights(eligible) : eligible;
  const reserved =
    policy.shortPathMode === "RENORMALIZE_EXISTING"
      ? reward
      : (reward * BigInt(weights.reduce((sum, weight) => sum + weight, 0))) / 10_000n;
  const rest = weights.slice(1).map((weight) => (reward * BigInt(weight)) / 10_000n);
  const amounts = [reserved - rest.reduce((sum, amount) => sum + amount, 0n), ...rest];
  return { amounts, weightsBps: weights, reserved, unallocated: reward - reserved };
};

export const simulatePolicy = (price: bigint, policy: CommissionPolicy, pathLength: number) =>
  allocatePolicyReward(
    computeReward(price, policy.commissionBps, BigInt(policy.perSaleCap)),
    policy,
    pathLength,
  );

export const hashPolicy = (policy: CommissionPolicy) => {
  const p = commissionPolicy.parse(policy);
  return keccak256(
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "rewardToken", type: "address" },
            { name: "commissionBps", type: "uint16" },
            { name: "maxRewardedAncestors", type: "uint16" },
            { name: "weightsBps", type: "uint16[]" },
            { name: "perSaleCap", type: "uint256" },
            { name: "campaignLiabilityCap", type: "uint256" },
            { name: "holdSeconds", type: "uint64" },
            { name: "expiry", type: "uint64" },
            { name: "shortPathMode", type: "uint8" },
            { name: "eligibilityHash", type: "bytes32" },
          ],
        },
      ],
      [
        {
          ...p,
          rewardToken: p.rewardToken as `0x${string}`,
          eligibilityHash: p.eligibilityHash as `0x${string}`,
          perSaleCap: BigInt(p.perSaleCap),
          campaignLiabilityCap: BigInt(p.campaignLiabilityCap),
          holdSeconds: BigInt(p.holdSeconds),
          expiry: BigInt(p.expiry),
          shortPathMode: p.shortPathMode === "RENORMALIZE_EXISTING" ? 0 : 1,
        },
      ],
    ),
  );
};
