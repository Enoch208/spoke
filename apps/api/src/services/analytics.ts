import { z } from "zod";
import { chartPoint, merchantAnalytics } from "@spoke/protocol";
import type { Services } from "../types.js";
import type { StoredRecord } from "../db/store.js";
import { counts, timestamp, allRecords } from "./read-utils.js";
import { jsonQuery } from "./read-utils.js";
import { allocations } from "./views.js";

export const dateRange = (query: Record<string, string>) => {
  const now = new Date();
  const raw: unknown = query.range
    ? jsonQuery(query.range)
    : {
        from: query.from ?? new Date(now.getTime() - 30 * 86400000).toISOString(),
        to: query.to ?? now.toISOString(),
      };
  return z
    .object({ from: z.iso.datetime(), to: z.iso.datetime() })
    .refine(
      (value) =>
        Date.parse(value.from) <= Date.parse(value.to) &&
        Date.parse(value.to) - Date.parse(value.from) <= 5 * 366 * 86400000,
      "Choose an ordered period of at most five years.",
    )
    .parse(raw);
};
export const analyticsPoint = (
  at: string,
  receipts: StoredRecord[],
  nodes: StoredRecord[],
  includePending = false,
) =>
  chartPoint.parse({
    at,
    sales: counts(receipts),
    value: receipts
      .filter((row) => row.payload.status === 3 || (includePending && row.payload.status === 1))
      .reduce((sum, row) => sum + BigInt(z.string().parse(row.payload.price)), 0n)
      .toString(),
    rewards: receipts
      .filter((row) => row.payload.status === 3 || (includePending && row.payload.status === 1))
      .reduce((sum, row) => sum + BigInt(z.string().parse(row.payload.rewardReserved)), 0n)
      .toString(),
    links: nodes.length,
  });
export const analyticsView = async (
  services: Services,
  ids: Set<string>,
  query: Record<string, string>,
) => {
  const period = dateRange(query);
  const allSales = (await allRecords(services.store, "receipt")).filter(
    (row) =>
      ids.has(z.string().parse(row.payload.campaignId)) &&
      (!query.source || query.source === "all" || query.source === "NATIVE_ONCHAIN"),
  );
  const allNodes = (await allRecords(services.store, "node")).filter((row) =>
    ids.has(z.string().parse(row.payload.campaignId)),
  );
  const inRange = (value: unknown) =>
    timestamp(value) >= period.from && timestamp(value) <= period.to;
  const receipts = allSales.filter((row) => inRange(row.payload.purchasedAt));
  const nodes = allNodes.filter((row) => inRange(row.payload.createdAt));
  const includePending = query.basis === "settledAndPending" || query.basis === "all";
  const keys = [
    ...new Set([
      ...receipts.map((row) => timestamp(row.payload.purchasedAt).slice(0, 10)),
      ...nodes.map((row) => timestamp(row.payload.createdAt).slice(0, 10)),
    ]),
  ].sort();
  const series = keys.map((day) =>
    analyticsPoint(
      `${day}T00:00:00.000Z`,
      receipts.filter((row) => timestamp(row.payload.purchasedAt).startsWith(day)),
      nodes.filter((row) => timestamp(row.payload.createdAt).startsWith(day)),
      includePending,
    ),
  );
  const duration = Date.parse(period.to) - Date.parse(period.from);
  const previousFrom = new Date(Date.parse(period.from) - duration).toISOString();
  const previousSales = allSales.filter(
    (row) =>
      timestamp(row.payload.purchasedAt) >= previousFrom &&
      timestamp(row.payload.purchasedAt) < period.from,
  );
  const previousNodes = allNodes.filter(
    (row) =>
      timestamp(row.payload.createdAt) >= previousFrom &&
      timestamp(row.payload.createdAt) < period.from,
  );
  const depthMap = new Map<number, { sales: number; rewards: bigint }>();
  for (const row of receipts.filter((row) => row.payload.status === 3)) {
    const split = allocations.parse(row.payload.allocations);
    if (!split.length) continue;
    const value = depthMap.get(split.length) ?? { sales: 0, rewards: 0n };
    depthMap.set(split.length, {
      sales: value.sales + 1,
      rewards: value.rewards + BigInt(z.string().parse(row.payload.rewardReserved)),
    });
  }
  const links = await allRecords(services.store, "link");
  const visits = links
    .filter((row) => ids.has(z.string().parse(row.payload.campaignId)))
    .reduce(
      (sum, row) => sum + z.number().int().nonnegative().parse(row.payload.visitsEstimate),
      0,
    );
  const cohortRows = new Map<string, Map<string, StoredRecord>>();
  const firstNodes = new Map<string, StoredRecord>();
  for (const node of allNodes) {
    const existing = firstNodes.get(node.owner);
    if (
      !existing ||
      BigInt(z.string().parse(node.payload.createdAt)) <
        BigInt(z.string().parse(existing.payload.createdAt))
    )
      firstNodes.set(node.owner, node);
  }
  for (const node of firstNodes.values()) {
    const created = Date.parse(timestamp(node.payload.createdAt));
    const week = new Date(Math.floor(created / (7 * 86400000)) * 7 * 86400000).toISOString();
    const owners = cohortRows.get(week) ?? new Map<string, StoredRecord>();
    owners.set(node.owner, node);
    cohortRows.set(week, owners);
  }
  const cohortGrid = [...cohortRows]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([cohort, owners]) => ({
      cohort,
      periods: Array.from(
        { length: 12 },
        (_, index) =>
          receipts.filter(
            (receipt) =>
              receipt.payload.status === 3 &&
              Date.parse(timestamp(receipt.payload.purchasedAt)) >=
                Date.parse(cohort) + index * 7 * 86400000 &&
              Date.parse(timestamp(receipt.payload.purchasedAt)) <
                Date.parse(cohort) + (index + 1) * 7 * 86400000 &&
              allocations
                .parse(receipt.payload.allocations)
                .some((allocation) => owners.has(allocation.recipient.toLowerCase())),
          ).length,
      ),
    }));
  return merchantAnalytics.parse({
    period,
    series,
    totals: analyticsPoint(period.to, receipts, nodes, includePending),
    previousPeriodTotals:
      query.compare === "true"
        ? analyticsPoint(period.from, previousSales, previousNodes, includePending)
        : null,
    depthMix: [...depthMap]
      .sort(([a], [b]) => a - b)
      .map(([depth, value]) => ({ depth, sales: value.sales, rewards: value.rewards.toString() })),
    networkGrowth: series,
    funnel: [
      { stage: "Referral opens", count: visits, estimate: true },
      { stage: "Links created", count: nodes.length, estimate: false },
      { stage: "Purchases", count: receipts.length, estimate: false },
      {
        stage: "Settled",
        count: receipts.filter((row) => row.payload.status === 3).length,
        estimate: false,
      },
    ],
    cohortGrid,
    byCampaign: [...ids].map((id) => ({
      campaignId: id,
      totals: analyticsPoint(
        period.to,
        receipts.filter((row) => row.payload.campaignId === id),
        nodes.filter((row) => row.payload.campaignId === id),
        includePending,
      ),
    })),
  });
};
