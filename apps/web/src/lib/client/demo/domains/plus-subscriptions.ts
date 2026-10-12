import { iso } from "../../../../demo/world/ids";
import {
  addToSeries,
  periodMs,
  renewalReward,
  type RenewalEvent,
  type Subscriber,
} from "../../../../demo/world/seed-growth-plus-renewals";
import { policyAt } from "../../../../demo/world/sale-math";
import type { DemoWorld, SubscriptionCampaign } from "../../../../demo/world/world";
import { campaignOf, campaignState, priceOf, rewardPerSale } from "../views/catalog";

const copyPlan = (plan: SubscriptionCampaign): SubscriptionCampaign => ({
  ...plan,
  subscribers: plan.subscribers.map((subscriber) => ({ ...subscriber })),
  series: plan.series.map((point) => ({ ...point, sales: { ...point.sales } })),
});

export const presentPlan = (
  world: DemoWorld,
  plan: SubscriptionCampaign,
  now: number,
): SubscriptionCampaign => {
  const campaign = campaignOf(world, plan.campaignId);
  if (!campaign) return copyPlan(plan);
  const period = periodMs(plan.billingPeriod);
  const price = priceOf(world, campaign);
  const holdMs = policyAt(campaign, now).policy.holdSeconds * 1000;
  const events: RenewalEvent[] = [];
  const mature = (subscriber: Subscriber): Subscriber => {
    if (subscriber.nextRenewalAt === null) return { ...subscriber };
    let next = Date.parse(subscriber.nextRenewalAt);
    if (next <= world.anchor) return { ...subscriber };
    let renewals = subscriber.renewalCount;
    let rewards = BigInt(subscriber.rewards);
    const cap = BigInt(subscriber.cap);
    while (next <= now) {
      renewals += 1;
      const earns = campaignState(campaign, next) === "FUNDED_ACTIVE";
      const perRenewal = rewardPerSale(world, campaign, next);
      const reward = earns ? renewalReward(renewals, rewards, cap, perRenewal) : 0n;
      rewards += reward;
      events.push({
        at: next,
        price,
        reward,
        state: next + holdMs > now ? "pending" : "finalized",
      });
      next += period;
    }
    return {
      ...subscriber,
      renewalCount: renewals,
      rewards: rewards.toString(),
      nextRenewalAt: iso(next),
    };
  };
  const subscribers = plan.subscribers.map(mature);
  return { ...copyPlan(plan), subscribers, series: addToSeries(plan.series, events) };
};
