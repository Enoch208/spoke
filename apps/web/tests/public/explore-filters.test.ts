import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  defaultFilters,
  filtersToParams,
  isNarrowed,
  listInput,
  parseFilters,
} from "../../src/components/public/explore/filters";
import {
  isInvitationOnly,
  nearestShare,
  rewardAtPrice,
  salesLeft,
  splitAtPrice,
} from "../../src/components/public/shared/policy-math";

const policy = {
  rewardToken: "0xb6279237003eD710bB4ccE6fbd126e07eD4D8E23",
  commissionBps: 1000,
  perSaleCap: "1000000000",
  campaignLiabilityCap: "100000000000",
  maxRewardedAncestors: 4,
  weightsBps: [5000, 2500, 1500, 1000],
  shortPathMode: "RENORMALIZE_EXISTING" as const,
  holdSeconds: 600,
  expiry: "1794432324",
  eligibilityHash: `0x${"0".repeat(64)}`,
};

describe("explore filters", () => {
  it("round-trips through the URL and ignores unknown values", () => {
    const filters = parseFilters(
      new URLSearchParams(
        "q=pack&category=design&rate=from10&levels=4&status=all&sort=hold&hold=x",
      ),
    );
    expect(filters).toEqual({
      ...defaultFilters,
      q: "pack",
      category: "design",
      rate: "from10",
      levels: "4",
      status: "all",
      sort: "hold",
    });
    expect(parseFilters(filtersToParams(filters))).toEqual(filters);
    expect(filtersToParams(defaultFilters).toString()).toBe("");
  });

  it("counts filters and tells narrowing apart from showing closed campaigns", () => {
    const all = { ...defaultFilters, status: "all" as const };
    expect(activeFilterCount(all)).toBe(1);
    expect(isNarrowed(all)).toBe(false);
    expect(isNarrowed({ ...defaultFilters, access: "invite" })).toBe(true);
  });

  it("maps choices to the list method's inputs", () => {
    const input = listInput(
      { ...defaultFilters, rate: "from5", levels: "2", hold: "day", access: "invite" },
      "paused",
      24,
    );
    expect(input).toEqual({
      status: "paused",
      limit: 24,
      sort: "balanced",
      rateMin: 500,
      rateMax: 1000,
      levels: 2,
      holdMax: 86_399,
      invitationOnly: true,
    });
  });
});

describe("card reward math", () => {
  it("matches the protocol vectors at list price", () => {
    expect(rewardAtPrice(40_000_000n, policy)).toBe(4_000_000n);
    expect(splitAtPrice(10_000n, policy).amounts).toEqual([500n, 250n, 150n, 100n]);
    expect(splitAtPrice(10_010n, policy).amounts).toEqual([501n, 250n, 150n, 100n]);
    expect(splitAtPrice(40_000_000n, policy, 2).weightsBps).toEqual([6667, 3333]);
    expect(nearestShare(40_000_000n, policy)).toBe(2_000_000n);
  });

  it("caps per sale and estimates sales left from the budget", () => {
    expect(rewardAtPrice(40_000_000n, { ...policy, perSaleCap: "1500000" })).toBe(1_500_000n);
    expect(salesLeft(9_000_000n, 4_000_000n)).toBe(2n);
    expect(salesLeft(9_000_000n, 0n)).toBe(0n);
    expect(isInvitationOnly(policy)).toBe(false);
    expect(isInvitationOnly({ eligibilityHash: `0x${"1".repeat(64)}` })).toBe(true);
  });
});
