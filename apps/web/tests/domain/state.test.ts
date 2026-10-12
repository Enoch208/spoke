import { describe, expect, it } from "vitest";
import {
  campaignStateKey,
  merchantRowStateKey,
  publicExplainer,
  rewardPerSale,
} from "../../src/lib/domain/campaign-state";
import { saleStateKey, shareBucket } from "../../src/lib/domain/sale-state";
import { isActiveHref } from "../../src/components/app/nav";
import { isPublicPath } from "../../src/components/app/shell/use-area";

const live = {
  state: "FUNDED_ACTIVE" as const,
  price: "40000000",
  rewardAvailable: "400000000",
  policy: { commissionBps: 2500, perSaleCap: "1000000000" },
};

describe("campaign state", () => {
  it("computes the reward a single sale reserves, capped per sale", () => {
    expect(rewardPerSale(live)).toBe(10_000_000n);
    expect(rewardPerSale({ ...live, policy: { commissionBps: 2500, perSaleCap: "4000000" } })).toBe(
      4_000_000n,
    );
  });

  it("is live while the budget covers the next reward and exhausted once it can't", () => {
    expect(campaignStateKey(live)).toBe("live");
    expect(campaignStateKey({ ...live, rewardAvailable: "9999999" })).toBe("exhausted");
  });

  it("puts moderation and onchain status ahead of budget", () => {
    expect(campaignStateKey({ ...live, moderation: { hidden: true } })).toBe("hidden");
    expect(campaignStateKey({ ...live, state: "PAUSED" })).toBe("paused");
    expect(campaignStateKey({ ...live, state: "CREATED_UNFUNDED" })).toBe("notFunded");
  });

  it("reads merchant rows whose state is a plain string", () => {
    const row = { state: "FUNDED_ACTIVE", rewardPerSale: "10", availableRewards: "9" };
    expect(merchantRowStateKey(row)).toBe("exhausted");
    expect(merchantRowStateKey({ ...row, availableRewards: "10" })).toBe("live");
    expect(merchantRowStateKey({ ...row, state: "ENDED" })).toBe("ended");
    expect(merchantRowStateKey({ ...row, state: "DRAFT_OFFCHAIN" })).toBe("draft");
  });

  it("has a public sentence for every state a visitor can see", () => {
    for (const key of ["live", "exhausted", "paused", "ended", "expired", "notFunded"] as const)
      expect(publicExplainer(key).length).toBeGreaterThan(10);
  });
});

describe("sale and share state", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  const before = "2026-10-12T11:00:00Z";
  const after = "2026-10-12T13:00:00Z";

  it("shows a pending sale as ready to finalize once its hold has ended", () => {
    expect(saleStateKey("PENDING", after, now)).toBe("pending");
    expect(saleStateKey("PENDING", before, now)).toBe("readyToFinalize");
    expect(saleStateKey("FINALIZED", before, now)).toBe("settled");
    expect(saleStateKey("REFUNDED", after, now)).toBe("refunded");
  });

  it("splits a reserved share into at risk and ready to finalize by the hold", () => {
    expect(shareBucket("reserved", after, now)).toBe("atRisk");
    expect(shareBucket("reserved", before, now)).toBe("readyToFinalize");
    expect(shareBucket("refunded", after, now)).toBe("refunded");
    expect(shareBucket("claimed", before, now)).toBe("claimed");
  });
});

describe("shell routing", () => {
  it("treats product pages anyone can open as public, and workspace pages as private", () => {
    for (const path of ["/explore", "/c/7", "/c/7/network", "/r/abc", "/receipts/10143/9", "/demo"])
      expect(isPublicPath(path)).toBe(true);
    for (const path of ["/earn", "/sell/vault", "/settings/profile", "/purchases", "/cart"])
      expect(isPublicPath(path)).toBe(false);
  });

  it("keeps Explore highlighted on campaign, referral and merchant pages", () => {
    expect(isActiveHref("/c/7", "/explore")).toBe(true);
    expect(isActiveHref("/m/northbeam", "/explore")).toBe(true);
    expect(isActiveHref("/u/mara", "/distributors")).toBe(true);
    expect(isActiveHref("/earn/links", "/explore")).toBe(false);
    expect(isActiveHref("/earn/links", "/earn")).toBe(false);
  });
});
