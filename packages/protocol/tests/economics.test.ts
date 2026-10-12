import { describe, expect, it } from "vitest";
import { allocateReward, computeReward, splitReward } from "../src/economics.js";

const addresses = [
  "0x0000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
  "0x0000000000000000000000000000000000000004",
] as const;
const weights = [5000, 2500, 1500, 1000];
describe("v3 merchant policy math", () => {
  it("caps and floors commission in base units", () => {
    expect(computeReward(100_000_000n, 1000, 10_000_000n)).toBe(10_000_000n);
    expect(computeReward(100_000_000n, 1000, 4_000_000n)).toBe(4_000_000n);
    expect(computeReward(999n, 1000, 1000n)).toBe(99n);
    expect(computeReward(1001n, 10000, 2000n)).toBe(1001n);
    expect(() => computeReward(100n, 10001, 100n)).toThrow(RangeError);
  });
  it.each([
    [1000n, [500n, 250n, 150n, 100n]],
    [1001n, [501n, 250n, 150n, 100n]],
    [1n, [1n, 0n, 0n, 0n]],
  ] as const)("conserves the %s golden vector", (reward, expected) => {
    expect(splitReward(reward, weights)).toEqual(expected);
  });
  it("labels four levels and takes explicit policy weights", () => {
    const result = allocateReward(1000n, addresses, weights);
    expect(result.map((allocation) => allocation.amountMinor)).toEqual([500n, 250n, 150n, 100n]);
    expect(result[3]).toMatchObject({ role: "ancestor", depth: 3, effectiveWeightBps: 1000 });
  });
  it("rejects malformed weights and duplicated wallets", () => {
    expect(() => splitReward(1000n, [5000, 2500])).toThrow(RangeError);
    expect(() => allocateReward(1000n, [addresses[0], addresses[0]], [5000, 5000])).toThrow(
      RangeError,
    );
  });
});
