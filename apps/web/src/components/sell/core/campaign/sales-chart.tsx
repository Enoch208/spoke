"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SkeletonChartFrame } from "@/components/ui/skeleton";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { cx } from "@/components/ui/cx";
import { useClientQuery } from "@/lib/query/use-client";
import { overviewCopy as copy } from "../copy/campaign";

const periods = ["7d", "30d", "90d"] as const;
type Period = (typeof periods)[number];
const days = { "7d": 7, "30d": 30, "90d": 90 } as const;
const dayMs = 86_400_000;

const series = [
  { key: "finalized", label: copy.finalized, swatch: "bg-chart-settled" },
  { key: "pending", label: copy.pending, swatch: "bg-chart-pending" },
  { key: "refunded", label: copy.refunded, swatch: "bg-chart-refunded" },
] as const;

const dayLabel = (at: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(at));

export function SalesChart({ campaignId }: { campaignId: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [table, setTable] = useState(false);
  const [anchor] = useState(() => Date.now());
  const analytics = useClientQuery("analytics.campaign", {
    campaignId,
    range: {
      from: new Date(anchor - days[period] * dayMs).toISOString(),
      to: new Date(anchor).toISOString(),
    },
  });
  const points = analytics.data?.series ?? [];
  const peak = Math.max(
    1,
    ...points.map((point) => point.sales.pending + point.sales.finalized + point.sales.refunded),
  );
  return (
    <Card padding="lg" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.chart}</h2>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onValueChange={setPeriod}
            className="w-36! shrink-0"
            options={periods.map((value) => ({ value, label: copy.periods[value] }))}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTable(!table);
            }}
          >
            {table ? copy.chartBars : copy.chartTable}
          </Button>
        </div>
      </div>
      {analytics.isPending ? (
        <SkeletonChartFrame className="h-48" />
      ) : table ? (
        <Table caption={copy.chart}>
          <THead>
            <tr>
              <Th>{copy.day}</Th>
              {series.map((item) => (
                <Th key={item.key} numeric>
                  {item.label}
                </Th>
              ))}
            </tr>
          </THead>
          <TBody>
            {points.map((point) => (
              <tr key={point.at}>
                <Td>{dayLabel(point.at)}</Td>
                {series.map((item) => (
                  <Td key={item.key} numeric>
                    {point.sales[item.key]}
                  </Td>
                ))}
              </tr>
            ))}
          </TBody>
        </Table>
      ) : (
        <div>
          <div
            role="img"
            aria-label={`${copy.chart}: ${series
              .map(
                (item) =>
                  `${item.label} ${String(points.reduce((sum, point) => sum + point.sales[item.key], 0))}`,
              )
              .join(", ")}`}
            className="border-line flex h-44 items-end gap-[2px] border-b"
          >
            {points.map((point) => (
              <div
                key={point.at}
                title={`${dayLabel(point.at)}: ${String(point.sales.finalized)} finalized, ${String(point.sales.pending)} pending, ${String(point.sales.refunded)} refunded`}
                className="flex h-full min-w-0 flex-1 flex-col-reverse"
              >
                {series.map((item) =>
                  point.sales[item.key] > 0 ? (
                    <span
                      key={item.key}
                      className={cx("w-full first:rounded-b-none last:rounded-t-sm", item.swatch)}
                      style={{ height: `${String((point.sales[item.key] / peak) * 100)}%` }}
                    />
                  ) : null,
                )}
              </div>
            ))}
          </div>
          <div className="text-subtle mt-2 flex justify-between text-xs">
            <span>{points[0] ? dayLabel(points[0].at) : ""}</span>
            <span>{points.at(-1) ? dayLabel(points.at(-1)?.at ?? "") : ""}</span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-4 text-sm">
            {series.map((item) => (
              <li key={item.key} className="text-body flex items-center gap-2">
                <span aria-hidden="true" className={cx("size-2.5 rounded-full", item.swatch)} />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
