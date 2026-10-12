import { describe, expect, it } from "vitest";
import {
  allocatePolicyReward,
  commissionPolicy,
  hashPolicy,
  normalizeWeights,
  simulatePolicy,
} from "../src/policy.js";

const policy = commissionPolicy.parse({
  rewardToken: "0x0000000000000000000000000000000000000001",
  commissionBps: 1000,
  perSaleCap: "1000000",
  campaignLiabilityCap: "100000000",
  maxRewardedAncestors: 4,
  weightsBps: [5000, 2500, 1500, 1000],
  holdSeconds: 60,
  expiry: "2000000000",
  eligibilityHash: `0x${"0".repeat(64)}`,
});

describe("v3 policy economics", () => {
  it.each([
    [1000n, [500n, 250n, 150n, 100n]],
    [1001n, [501n, 250n, 150n, 100n]],
    [1n, [1n, 0n, 0n, 0n]],
    [0n, [0n, 0n, 0n, 0n]],
  ] as const)("splits %s base units exactly", (reward, expected) => {
    expect(allocatePolicyReward(reward, policy, 4).amounts).toEqual(expected);
  });
  it("renormalizes a two-payee path deterministically", () => {
    expect(normalizeWeights([5000, 2500])).toEqual([6667, 3333]);
    expect(allocatePolicyReward(1000n, policy, 2).amounts).toEqual([667n, 333n]);
  });
  it("returns unused short-path shares without creating a liability", () => {
    const result = allocatePolicyReward(1001n, { ...policy, shortPathMode: "RETURN_UNUSED" }, 2);
    expect(result).toMatchObject({ amounts: [500n, 250n], reserved: 750n, unallocated: 251n });
  });
  it("gives direct purchases no reward liability", () => {
    expect(allocatePolicyReward(1000n, policy, 0)).toMatchObject({
      amounts: [],
      reserved: 0n,
      unallocated: 1000n,
    });
  });
  it("does not grow payout work with graph depth", () => {
    expect(allocatePolicyReward(1000n, policy, 1000000).amounts).toHaveLength(4);
  });
  it("conserves inventory for arbitrary rewards and both short-path modes", () => {
    for (let reward = 0n; reward < 10000n; reward += 97n)
      for (const mode of ["RETURN_UNUSED", "RENORMALIZE_EXISTING"] as const)
        for (let count = 0; count <= 6; count++) {
          const result = allocatePolicyReward(reward, { ...policy, shortPathMode: mode }, count);
          expect(result.amounts.reduce((sum, amount) => sum + amount, 0n)).toBe(result.reserved);
          expect(result.reserved + result.unallocated).toBe(reward);
        }
  });
  it("rejects invalid weights and liability caps", () => {
    expect(commissionPolicy.safeParse({ ...policy, weightsBps: [5000, 5000] }).success).toBe(false);
    expect(commissionPolicy.safeParse({ ...policy, campaignLiabilityCap: "1" }).success).toBe(
      false,
    );
    expect(commissionPolicy.safeParse({ ...policy, maxRewardedAncestors: 8 }).success).toBe(false);
  });
  it("hashes every economic term and keeps high-precision money as bigint", () => {
    expect(hashPolicy(policy)).toBe(
      "0x5e1f7f9d859f5a0f3de637a283e1d2de476cf15d4a7c4bd083d01c74daf1f4b6",
    );
    expect(hashPolicy(policy)).not.toBe(hashPolicy({ ...policy, holdSeconds: 61 }));
    expect(hashPolicy(policy)).not.toBe(hashPolicy({ ...policy, shortPathMode: "RETURN_UNUSED" }));
    expect(simulatePolicy(99999999999999999999999n, policy, 4).reserved).toBe(1000000n);
  });
});
