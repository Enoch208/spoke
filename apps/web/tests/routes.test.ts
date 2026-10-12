import { describe, expect, it } from "vitest";
import { features, featureKeys, isFeatureKey, isLive } from "@/lib/features";
import { afterAuthPath, authHref, isSafeNext, routeTo, routes, withNext } from "@/lib/routes";

describe("routes", () => {
  it("points the landing constants at real screens", () => {
    expect(routes.explore).toBe("/explore");
    expect(routes.docs).toBe("/developers");
    expect(routes.launch).toBe("/signup?intent=sell");
    expect(routes.start).toBe("/signup");
  });

  it("sends new accounts through onboarding and returning ones to where they were going", () => {
    expect(afterAuthPath({ isNewAccount: true, next: "/c/7", intent: "buy" })).toBe(
      "/welcome?next=%2Fc%2F7&intent=buy",
    );
    expect(afterAuthPath({ isNewAccount: false, next: "/c/7", intent: null })).toBe("/c/7");
    expect(afterAuthPath({ isNewAccount: false, next: null, intent: "sell" })).toBe("/sell/setup");
    expect(afterAuthPath({ isNewAccount: false, next: null, intent: null })).toBe("/earn");
    expect(authHref("login", { next: "/earn/links" })).toBe("/login?next=%2Fearn%2Flinks");
  });

  it("builds dynamic routes with encoded segments", () => {
    expect(routeTo.receipt(10143, "9001")).toBe("/receipts/10143/9001");
    expect(routeTo.receipt("demo", "demo-s-4")).toBe("/receipts/demo/demo-s-4");
    expect(routeTo.sellCampaign("42", "policy")).toBe("/sell/campaigns/42?tab=policy");
    expect(routeTo.sellCampaign("42", "overview")).toBe("/sell/campaigns/42");
    expect(routeTo.profile("a b")).toBe("/u/a%20b");
  });

  it("adds a next parameter and accepts only same-site paths", () => {
    expect(withNext(routes.sell.setup, "/sell/campaigns/new")).toBe(
      "/sell/setup?next=%2Fsell%2Fcampaigns%2Fnew",
    );
    expect(withNext("/demo?x=1", "/earn")).toBe("/demo?x=1&next=%2Fearn");
    expect(isSafeNext("/earn")).toBe(true);
    expect(isSafeNext("//evil.example")).toBe(false);
    expect(isSafeNext("https://evil.example")).toBe(false);
    expect(isSafeNext(null)).toBe(false);
  });
});

describe("feature registry", () => {
  it("enables verified core paths while keeping upcoming integrations in demo", () => {
    expect(isLive("composer")).toBe(true);
    expect(isLive("checkout")).toBe(true);
    expect(isLive("settlement")).toBe(true);
    expect(isLive("gasSponsorship")).toBe(true);
    expect(isLive("shopify")).toBe(false);
    expect(isLive("sdkWrite")).toBe(false);
    expect(
      featureKeys.every(
        (key) => features[key].status !== "live" || features[key].target === "live",
      ),
    ).toBe(true);
  });

  it("keeps the planned submission status for each feature", () => {
    expect(features.checkout.target).toBe("live");
    expect(features.shopify.target).toBe("demo-only");
    expect(isFeatureKey("checkout")).toBe(true);
    expect(isFeatureKey("nonsense")).toBe(false);
  });
});
