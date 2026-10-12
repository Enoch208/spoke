import { describe, expect, it } from "vitest";
import { allocateReward, computeReward, splitReward } from "../src/economics.js";

const alice = "0x00000000000000000000000000000000000A11CE";
const ben = "0x0000000000000000000000000000000000000BE0";
const chi = "0x0000000000000000000000000000000000000C41";

describe("computeReward", () => {
  it("takes the rate of the price in base units", () => {
    expect(computeReward(100_000_000n, 1_000, 10_000_000n)).toBe(10_000_000n);
  });

  it("caps the reward at the per-sale maximum", () => {
    expect(computeReward(100_000_000n, 1_000, 4_000_000n)).toBe(4_000_000n);
  });

  it("floors fractional base units", () => {
    expect(computeReward(999n, 1_000, 1_000n)).toBe(99n);
  });

  it("rejects a rate above 100%", () => {
    expect(() => computeReward(100n, 10_001, 100n)).toThrow(RangeError);
  });
});

describe("splitReward", () => {
  it("T13: one recipient takes the whole reward", () => {
    expect(splitReward(10_000_000n, 1)).toEqual([10_000_000n]);
  });

  it("T14: two recipients split 75/25 nearest first", () => {
    expect(splitReward(10_000_000n, 2)).toEqual([7_500_000n, 2_500_000n]);
  });

  it("T15: three recipients split 60/25/15 nearest first", () => {
    expect(splitReward(10_000_000n, 3)).toEqual([6_000_000n, 2_500_000n, 1_500_000n]);
  });

  it("T16: the nearest recipient takes the rounding remainder", () => {
    expect(splitReward(10n, 3)).toEqual([7n, 2n, 1n]);
  });

  it("never loses a base unit", () => {
    for (let reward = 0n; reward < 2_000n; reward += 7n) {
      for (const count of [1, 2, 3] as const) {
        const total = splitReward(reward, count).reduce((sum, amount) => sum + amount, 0n);
        expect(total).toBe(reward);
      }
    }
  });
});

describe("allocateReward", () => {
  it("labels recipients by depth for the Chi → Ben → Alice path", () => {
    expect(allocateReward(10_000_000n, [chi, ben, alice])).toEqual([
      { recipient: chi, role: "nearest", depth: 0, amountMinor: 6_000_000n },
      { recipient: ben, role: "parent", depth: 1, amountMinor: 2_500_000n },
      { recipient: alice, role: "grandparent", depth: 2, amountMinor: 1_500_000n },
    ]);
  });

  it("rejects an empty or over-long path", () => {
    expect(() => allocateReward(10n, [])).toThrow(RangeError);
    expect(() => allocateReward(10n, [chi, ben, alice, chi])).toThrow(RangeError);
  });
});
