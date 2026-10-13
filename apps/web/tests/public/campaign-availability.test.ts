import { describe, expect, it } from "vitest";
import { actionPlan, availabilityKey } from "../../src/components/public/campaign/availability";
import { pathSplit, projectionSplit } from "../../src/components/public/referral/path-math";

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

const now = Date.parse("2026-10-13T00:00:00Z");

const live = {
  state: "FUNDED_ACTIVE" as const,
  endsAt: "2026-11-11T00:00:00.000Z",
  moderation: { hidden: false, reason: null },
  counts: { pending: 1, finalized: 2, refunded: 0 },
  capacity: { nodes: 256, sales: 100 },
  price: "40000000",
  rewardAvailable: "40000000",
};

const actor = (handle: string) => ({
  address: null,
  handle,
  displayName: null,
  visibility: "pseudonymous" as const,
});

const entry = (handle: string, repeatedWallet = false) => ({
  nodeId: handle,
  creator: actor(handle),
  depth: 1,
  paid: true,
  repeatedWallet,
  outsideWindow: false,
  effectiveWeightBps: 0,
  amount: "0",
  state: null,
  reasonIfUnpaid: null,
});

describe("campaign availability", () => {
  it("walks the states top to bottom", () => {
    expect(availabilityKey(live, policy, now)).toBe("live");
    expect(
      availabilityKey({ ...live, moderation: { hidden: true, reason: null } }, policy, now),
    ).toBe("hidden");
    expect(availabilityKey({ ...live, state: "PAUSED" }, policy, now)).toBe("paused");
    expect(availabilityKey({ ...live, endsAt: "2026-10-01T00:00:00.000Z" }, policy, now)).toBe(
      "expired",
    );
    expect(
      availabilityKey(
        { ...live, counts: { pending: 50, finalized: 40, refunded: 10 } },
        policy,
        now,
      ),
    ).toBe("salesLimit");
    expect(availabilityKey({ ...live, rewardAvailable: "3999999" }, policy, now)).toBe("exhausted");
  });

  it("never enables a purchase through a link once rewards are used up", () => {
    expect(actionPlan("exhausted", true)).toMatchObject({
      buy: "disabled",
      buyWithoutRewards: true,
      create: "enabled",
    });
    expect(actionPlan("exhausted", false)).toMatchObject({
      buy: "enabled",
      buyWithoutRewards: false,
    });
    for (const key of ["paused", "ended", "expired", "notOpenYet"] as const)
      expect(actionPlan(key, false).buy).not.toBe("enabled");
  });
});

describe("referral path math", () => {
  it("pays the nearest four and reports who is outside the window", () => {
    const path = ["a", "b", "c", "d", "e", "f"].map((handle) => entry(handle));
    const split = pathSplit(10_000n, policy, path);
    expect(split.rows.map((row) => row.amount)).toEqual([500n, 250n, 150n, 100n]);
    expect(split.outside.map((item) => item.nodeId)).toEqual(["e", "f"]);
  });

  it("renormalizes short paths and skips repeated wallets", () => {
    const split = pathSplit(10_000n, policy, [entry("a"), entry("a", true), entry("b")]);
    expect(split.weightsBps).toEqual([6667, 3333]);
    expect(split.repeated).toHaveLength(1);
  });

  it("projects a new link with the viewer first and drops the farthest ancestor", () => {
    const projection = projectionSplit(
      10_000n,
      policy,
      ["a", "b", "c", "d"].map((h) => entry(h)),
    );
    expect(projection.viewer.amount).toBe(500n);
    expect(projection.rows.map((row) => row.entry.nodeId)).toEqual(["a", "b", "c"]);
    expect(projection.dropped?.nodeId).toBe("d");
  });
});
