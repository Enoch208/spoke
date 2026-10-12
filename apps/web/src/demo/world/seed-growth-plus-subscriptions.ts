import { computeReward } from "@spoke/protocol";
import { units } from "./catalog";
import { DAY, iso } from "./ids";
import { policyAt } from "./sale-math";
import {
  periodMs,
  renewalReward,
  seriesBetween,
  type RenewalEvent,
  type Subscriber,
} from "./seed-growth-plus-renewals";
import { personaMerchant, scopedId } from "./seed-growth-plus-scope";
import type { DemoCore } from "./types";
import type { SubscriptionCampaign } from "./world";

type Ending = "renewing" | "cancelled" | "paymentFailed";

const subscriberRows: readonly (readonly [n: number, startedDaysAgo: number, ending: Ending])[] = [
  [1, 57, "renewing"],
  [2, 108, "renewing"],
  [3, 10, "renewing"],
  [4, 178, "renewing"],
  [5, 201, "renewing"],
  [6, 255, "renewing"],
  [7, 95, "cancelled"],
  [8, 152, "paymentFailed"],
];

const REFUNDED_RENEWAL = { subscriber: 7, renewal: 2 } as const;

export const PLAN_CAP = units(6);

export const seedSubscriptions = (core: DemoCore): SubscriptionCampaign[] => {
  const scope = personaMerchant(core).id;
  const anchor = core.anchor;
  const campaign = core.campaigns.find((candidate) => candidate.kind === "subscription");
  const product = core.products.find((candidate) => candidate.id === campaign?.productId);
  if (!campaign || !product)
    throw new RangeError("The sample world needs a subscription campaign.");
  const period = periodMs("monthly");
  const holdMs = policyAt(campaign, anchor).policy.holdSeconds * 1000;
  const planId = scopedId(scope, "plan", 1);
  const events: RenewalEvent[] = [];
  const subscribers = subscriberRows.map(([n, startedDaysAgo, ending]): Subscriber => {
    const startedAt = anchor - startedDaysAgo * DAY;
    const policy = policyAt(campaign, startedAt).policy;
    const perSale = computeReward(product.price, policy.commissionBps, BigInt(policy.perSaleCap));
    let rewards = perSale < PLAN_CAP ? perSale : PLAN_CAP;
    const due = Math.floor((anchor - startedAt) / period);
    const renewed = ending === "renewing" ? due : due - 1;
    for (let renewal = 1; renewal <= renewed; renewal += 1) {
      const at = startedAt + renewal * period;
      const refunded = n === REFUNDED_RENEWAL.subscriber && renewal === REFUNDED_RENEWAL.renewal;
      const reward = refunded ? 0n : renewalReward(renewal, rewards, PLAN_CAP, perSale);
      rewards += reward;
      events.push({
        at,
        price: product.price,
        reward,
        state: refunded ? "refunded" : at + holdMs > anchor ? "pending" : "finalized",
      });
    }
    const nextRenewalAt = ending === "cancelled" ? null : startedAt + (renewed + 1) * period;
    return {
      id: `${planId}-sub-${String(n)}`,
      renewalCount: renewed,
      rewards: rewards.toString(),
      cap: PLAN_CAP.toString(),
      nextRenewalAt: nextRenewalAt === null ? null : iso(nextRenewalAt),
    };
  });
  const firstEvent = Math.min(...events.map((event) => event.at));
  return [
    {
      id: planId,
      campaignId: campaign.id,
      name: "Sample · Pro templates monthly",
      billingPeriod: "monthly",
      subscribers,
      series: seriesBetween(events, firstEvent, anchor),
    },
    {
      id: scopedId(scope, "plan", 2),
      campaignId: `${scopedId(scope, "plan", 2)}-draft`,
      name: "Sample · Pro templates yearly",
      billingPeriod: "yearly",
      subscribers: [],
      series: [],
    },
  ];
};
