import { DAY, iso } from "./ids";
import type { SubscriptionCampaign } from "./world";

export const REWARDED_RENEWALS = 6;

export type ChartPoint = SubscriptionCampaign["series"][number];
export type Subscriber = SubscriptionCampaign["subscribers"][number];

export interface RenewalEvent {
  at: number;
  price: bigint;
  reward: bigint;
  state: "pending" | "finalized" | "refunded";
}

export const periodMs = (period: SubscriptionCampaign["billingPeriod"]) =>
  (period === "monthly" ? 30 : 365) * DAY;

export const renewalReward = (
  renewalNumber: number,
  rewardsSoFar: bigint,
  cap: bigint,
  perRenewal: bigint,
): bigint => {
  if (renewalNumber > REWARDED_RENEWALS) return 0n;
  const room = cap - rewardsSoFar;
  if (room <= 0n) return 0n;
  return perRenewal < room ? perRenewal : room;
};

const monthOf = (ms: number) => {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

const emptyPoint = (month: number): ChartPoint => ({
  at: iso(month),
  sales: { pending: 0, finalized: 0, refunded: 0 },
  value: "0",
  rewards: "0",
  links: 0,
});

const withEvent = (point: ChartPoint, event: RenewalEvent): ChartPoint => ({
  ...point,
  sales: { ...point.sales, [event.state]: point.sales[event.state] + 1 },
  value: event.state === "refunded" ? point.value : (BigInt(point.value) + event.price).toString(),
  rewards:
    event.state === "refunded" ? point.rewards : (BigInt(point.rewards) + event.reward).toString(),
});

export const addToSeries = (
  series: readonly ChartPoint[],
  events: readonly RenewalEvent[],
): ChartPoint[] => {
  const byMonth = new Map(series.map((point) => [Date.parse(point.at), point]));
  for (const event of events) {
    const month = monthOf(event.at);
    byMonth.set(month, withEvent(byMonth.get(month) ?? emptyPoint(month), event));
  }
  return [...byMonth.entries()].sort(([a], [b]) => a - b).map(([, point]) => point);
};

export const seriesBetween = (
  events: readonly RenewalEvent[],
  from: number,
  to: number,
): ChartPoint[] => {
  const months: ChartPoint[] = [];
  for (let month = monthOf(from); month <= to; month = monthOf(month + 32 * DAY))
    months.push(emptyPoint(month));
  return addToSeries(months, events);
};
