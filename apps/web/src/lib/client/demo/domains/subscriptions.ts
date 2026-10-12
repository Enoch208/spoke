import type { SubscriptionCampaign } from "../../../../demo/world/world";
import { fail, type PartialHandlers } from "../handler";
import { page } from "../views/basics";
import { campaignOf } from "../views/catalog";
import { replaceIn } from "./plus-integrations";
import { freshId, mine, myMerchant, myRecord } from "./plus-merchant";
import { presentPlan } from "./plus-subscriptions";

export const subscriptionsReads = {
  "subscriptions.list": (input, runtime) => {
    const now = runtime.now();
    const plans = mine(myMerchant(runtime), runtime.world.subscriptions).map((plan) =>
      presentPlan(runtime.world, plan, now),
    );
    return page(plans, input);
  },
  "subscriptions.get": (input, runtime) =>
    presentPlan(
      runtime.world,
      myRecord(
        myMerchant(runtime),
        runtime.world.subscriptions,
        input.id,
        "That subscription plan",
      ),
      runtime.now(),
    ),
} satisfies PartialHandlers<"subscriptions">;

export const subscriptionsWrites = {
  "subscriptions.save": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const world = runtime.world;
    const name = input.name.trim();
    if (name.length < 2 || name.length > 100)
      fail("VALIDATION_FAILED", "Give the plan a name between 2 and 100 characters.");
    const campaign = campaignOf(world, input.campaignId);
    if (campaign && campaign.kind !== "subscription")
      fail("VALIDATION_FAILED", "That campaign doesn't sell a subscription.");
    const existing = mine(merchant, world.subscriptions).find((plan) => plan.id === input.id);
    const termsChanged =
      existing !== undefined &&
      (existing.billingPeriod !== input.billingPeriod || existing.campaignId !== input.campaignId);
    if (existing?.subscribers.length && termsChanged)
      fail(
        "VALIDATION_FAILED",
        "A plan with subscribers keeps its campaign and billing period. Start a new plan instead.",
      );
    const saved: SubscriptionCampaign = {
      id: existing?.id ?? freshId(runtime, merchant.id, "plan"),
      campaignId: input.campaignId,
      name,
      billingPeriod: input.billingPeriod,
      subscribers: existing?.subscribers ?? [],
      series: existing?.series ?? [],
    };
    return presentPlan(world, replaceIn(world.subscriptions, saved), runtime.now());
  },
} satisfies PartialHandlers<"subscriptions">;
