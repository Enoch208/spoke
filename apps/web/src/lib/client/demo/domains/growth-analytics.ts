import type { ClientOutput } from "@spoke/protocol";
import { DAY, iso } from "../../../../demo/world/ids";
import type { DemoCampaign, DemoNode, DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { sum } from "../views/basics";
import { countsOf } from "../views/settlement";
import { periodWire, type Period } from "./growth-scope";

type Analytics = ClientOutput<"analytics.merchant">;
type ChartPoint = Analytics["totals"];

export interface AnalyticsQuery {
  campaigns: readonly DemoCampaign[];
  period: Period;
  source: DemoSale["source"] | null;
  withPending: boolean;
  compare: boolean;
  now: number;
}

interface Facts {
  sales: DemoSale[];
  nodes: DemoNode[];
  withPending: boolean;
}

const WEEK = 7 * DAY;
const COHORT_WEEKS = 12;
const DAILY_LIMIT = 180 * DAY;

export const sourceFilter = (value: string | undefined): DemoSale["source"] | null => {
  const key = value?.toLowerCase() ?? "";
  if (key.includes("attested")) return "merchant_attested";
  return key.includes("native") ? "native" : null;
};

export const includesPending = (basis: string | undefined): boolean =>
  basis?.toLowerCase().includes("pending") ?? false;

const between = (at: number, start: number, end: number) => at >= start && at < end;

const counted = (facts: Facts, sale: DemoSale) =>
  sale.status === "FINALIZED" || (facts.withPending && sale.status === "PENDING");

const rewardsOf = (sales: readonly DemoSale[]) =>
  sum(sales.flatMap((sale) => sale.allocations.map((allocation) => allocation.amount)));

const pointOf = (
  facts: Facts,
  at: number,
  sales: readonly DemoSale[],
  links: number,
): ChartPoint => {
  const kept = sales.filter((sale) => counted(facts, sale));
  return {
    at: iso(at),
    sales: countsOf(sales),
    value: sum(kept.map((sale) => sale.price)).toString(),
    rewards: rewardsOf(kept).toString(),
    links,
  };
};

const windowPoint = (facts: Facts, at: number, start: number, end: number): ChartPoint =>
  pointOf(
    facts,
    at,
    facts.sales.filter((sale) => between(sale.purchasedAt, start, end)),
    facts.nodes.filter((node) => between(node.createdAt, start, end)).length,
  );

const factsOf = (world: DemoWorld, query: AnalyticsQuery): Facts => {
  const ids = new Set<string>(query.campaigns.map((campaign) => campaign.id));
  return {
    sales: world.sales.filter(
      (sale) => ids.has(sale.campaignId) && (query.source === null || sale.source === query.source),
    ),
    nodes: world.nodes.filter((node) => ids.has(node.campaignId)),
    withPending: query.withPending,
  };
};

const scoped = (facts: Facts, campaign: DemoCampaign): Facts => ({
  ...facts,
  sales: facts.sales.filter((sale) => sale.campaignId === campaign.id),
  nodes: facts.nodes.filter((node) => node.campaignId === campaign.id),
});

const bucketsOf = (query: AnalyticsQuery) => {
  const earliest = Math.min(
    ...query.campaigns.map((campaign) => campaign.createdAt),
    query.period.to,
  );
  const start = Math.floor(Math.max(query.period.from, earliest) / DAY) * DAY;
  const step = query.period.to - start > DAILY_LIMIT ? WEEK : DAY;
  const starts: number[] = [];
  for (let at = start; at <= query.period.to; at += step) starts.push(at);
  return { starts, step };
};

const depthMix = (query: AnalyticsQuery, facts: Facts, sales: readonly DemoSale[]) => {
  const levels = Math.max(
    0,
    ...query.campaigns.flatMap((campaign) =>
      campaign.policies.map((version) => version.policy.maxRewardedAncestors),
    ),
  );
  const kept = sales.filter((sale) => counted(facts, sale));
  return Array.from({ length: levels }, (_, index) => {
    const hits = kept.filter((sale) => sale.allocations.length === index + 1);
    return { depth: index + 1, sales: hits.length, rewards: rewardsOf(hits).toString() };
  });
};

const visitsIn = (node: DemoNode, start: number, end: number, now: number) => {
  const life = Math.max(now - node.createdAt, DAY);
  const overlap = Math.max(0, Math.min(end, now) - Math.max(start, node.createdAt));
  return Math.floor((node.visits * overlap) / life);
};

const funnelOf = (query: AnalyticsQuery, facts: Facts, sales: readonly DemoSale[], end: number) => {
  const visits = facts.nodes.reduce(
    (total, node) => total + visitsIn(node, query.period.from, end, query.now),
    0,
  );
  const purchases = sales.length;
  return [
    { stage: "Visits", count: visits, estimate: true },
    {
      stage: "Checkouts started",
      count: purchases + Math.floor((purchases * 3) / 5),
      estimate: true,
    },
    { stage: "Purchases", count: purchases, estimate: false },
    { stage: "Settled sales", count: countsOf(sales).finalized, estimate: false },
  ];
};

const mondayOf = (at: number) => {
  const day = Math.floor(at / DAY) * DAY;
  return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY;
};

const settledShare = (facts: Facts, cohort: readonly DemoNode[], weekStart: number) => {
  if (!cohort.length) return 0;
  const settled = cohort.filter((node) =>
    facts.sales.some(
      (sale) =>
        sale.nodeId === node.id &&
        sale.status === "FINALIZED" &&
        between(sale.purchasedAt, weekStart, weekStart + WEEK),
    ),
  );
  return Math.round((settled.length / cohort.length) * 10_000) / 10_000;
};

const cohortGrid = (facts: Facts, to: number) => {
  const latest = mondayOf(to);
  return Array.from({ length: COHORT_WEEKS }, (_, index) => {
    const start = latest - (COHORT_WEEKS - 1 - index) * WEEK;
    const cohort = facts.nodes.filter((node) => between(node.createdAt, start, start + WEEK));
    const periods = Array.from({ length: COHORT_WEEKS - index }, (_, week) =>
      settledShare(facts, cohort, start + week * WEEK),
    );
    return { cohort: iso(start), periods };
  });
};

export const analyticsOf = (world: DemoWorld, query: AnalyticsQuery): Analytics => {
  const facts = factsOf(world, query);
  const { from } = query.period;
  const end = query.period.to + 1;
  const previous = Math.max(0, from - (end - from));
  const inRange = facts.sales.filter((sale) => between(sale.purchasedAt, from, end));
  const { starts, step } = bucketsOf(query);
  return {
    period: periodWire(query.period),
    series: starts.map((at) =>
      windowPoint(facts, at, Math.max(at, from), Math.min(at + step, end)),
    ),
    totals: windowPoint(facts, from, from, end),
    previousPeriodTotals: query.compare ? windowPoint(facts, previous, previous, from) : null,
    depthMix: depthMix(query, facts, inRange),
    networkGrowth: starts.map((at) => {
      const close = Math.min(at + step, end);
      return pointOf(
        facts,
        at,
        facts.sales.filter((sale) => sale.purchasedAt < close),
        facts.nodes.filter((node) => node.createdAt < close).length,
      );
    }),
    funnel: funnelOf(query, facts, inRange, end),
    cohortGrid: cohortGrid(facts, query.period.to),
    byCampaign: query.campaigns.map((campaign) => ({
      campaignId: campaign.id,
      totals: windowPoint(scoped(facts, campaign), from, from, end),
    })),
  };
};
