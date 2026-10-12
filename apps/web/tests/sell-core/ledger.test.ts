import { describe, expect, it } from "vitest";
import {
  committed,
  fullRewardsCovered,
  isExhausted,
  isLowBudget,
  obligations,
  proceedsBuckets,
  proceedsTotal,
  rewardBuckets,
  rewardsAddUp,
  roomUnderLimit,
} from "@/components/sell/core/shared/ledger";
import { maxTopUp, parseTopUp } from "@/components/sell/core/modals/top-up";

const sdusd = { decimals: 6, symbol: "SDUSD" };

const ledger = rewardBuckets({
  netDeposited: "994000000",
  available: "400000000",
  pendingReserved: "90000000",
  vestedUnclaimed: "198210400",
  rewardsClaimed: "305789600",
  surplusWithdrawn: "0",
});

describe("reward vault", () => {
  it("checks the five buckets against deposited in bigint", () => {
    expect(rewardsAddUp(ledger)).toBe(true);
    expect(rewardsAddUp({ ...ledger, available: ledger.available + 1n })).toBe(false);
  });

  it("derives committed, obligations and room under the limit", () => {
    expect(committed(ledger)).toBe(594_000_000n);
    expect(obligations(ledger)).toBe(288_210_400n);
    expect(roomUnderLimit(2_500_000_000n, ledger)).toBe(1_506_000_000n);
    expect(roomUnderLimit(900_000_000n, ledger)).toBe(0n);
  });

  it("counts full rewards covered and budget alerts", () => {
    expect(fullRewardsCovered(400_000_000n, 10_000_000n)).toBe(40n);
    expect(fullRewardsCovered(400_000_000n, 0n)).toBeNull();
    expect(isExhausted(9_999_999n, 10_000_000n)).toBe(true);
    expect(isExhausted(10_000_000n, 10_000_000n)).toBe(false);
    expect(isLowBudget(14_000_000n, 13_000_000n, 5)).toBe(true);
    expect(isLowBudget(70_000_000n, 13_000_000n, 5)).toBe(false);
  });
});

describe("sale proceeds", () => {
  it("sums the four proceeds buckets separately from rewards", () => {
    const proceeds = proceedsBuckets({
      proceedsPending: "400000000",
      proceedsClaimable: "1155000000",
      proceedsClaimed: "3836000000",
      buyerRefunded: "304000000",
    });
    expect(proceedsTotal(proceeds)).toBe(5_695_000_000n);
  });
});

describe("top-up amount", () => {
  const limits = { token: sdusd, balance: 48_200_000n, room: 1_506_000_000n, cap: 2_500_000_000n };

  it("accepts an exact amount", () => {
    expect(parseTopUp("25.5", limits)).toEqual({ ok: true, value: 25_500_000n });
    expect(parseTopUp("1,000", { ...limits, balance: null })).toEqual({
      ok: true,
      value: 1_000_000_000n,
    });
  });

  it("refuses invalid, zero, over-balance and over-room amounts", () => {
    expect(parseTopUp("", limits)).toEqual({ ok: false, error: null });
    expect(parseTopUp("abc", limits)).toEqual({
      ok: false,
      error: "Enter an amount like 250 or 250.50.",
    });
    expect(parseTopUp("1.1234567", limits)).toEqual({
      ok: false,
      error: "SDUSD has at most 6 decimal places.",
    });
    expect(parseTopUp("0", limits)).toEqual({ ok: false, error: "Enter more than 0." });
    expect(parseTopUp("49", limits).ok).toBe(false);
    expect(parseTopUp("20", { ...limits, balance: null, room: 10_000_000n }).ok).toBe(false);
  });

  it("caps Max by both the balance and the room", () => {
    expect(maxTopUp(limits)).toBe(48_200_000n);
    expect(maxTopUp({ ...limits, balance: null })).toBe(1_506_000_000n);
    expect(maxTopUp({ ...limits, room: 1_000_000n })).toBe(1_000_000n);
  });
});
