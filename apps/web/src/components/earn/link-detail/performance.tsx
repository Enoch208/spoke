"use client";

import type { ClientOutput } from "@spoke/protocol";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { formatAmount, formatCount, type TokenLike } from "@/lib/format";
import { linkDetailCopy } from "../copy/link-detail";
import { SalesChips } from "../links/link-cells";
import { VisitsInfo } from "../links/links-table";

const copy = linkDetailCopy.performance;

function Tile({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-surface border-hairline grid content-start gap-2 rounded-2xl border p-4">
      <p className="text-subtle text-sm">{label}</p>
      {children}
    </div>
  );
}

export function Performance({
  stats,
  token,
}: {
  stats: ClientOutput<"links.stats"> | undefined;
  token: TokenLike;
}) {
  if (!stats)
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  const money = (value: bigint) => formatAmount(value, token);
  const pending = BigInt(stats.earned.atRisk) + BigInt(stats.earned.readyToFinalize);
  return (
    <section aria-label={copy.title} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label={
          <>
            {copy.visits} <VisitsInfo />
          </>
        }
      >
        <p className="text-ink font-mono text-2xl tabular-nums">
          {formatCount(stats.visitsEstimate)}
        </p>
        <ul className="text-subtle grid gap-0.5 text-xs">
          {stats.visitsBySource.map((source) => (
            <li key={source.source} className="flex justify-between gap-2">
              <span>{source.source}</span>
              <span className="tabular-nums">{formatCount(source.count)}</span>
            </li>
          ))}
        </ul>
      </Tile>
      <Tile label={copy.under}>
        <p className="text-ink font-mono text-2xl tabular-nums">{formatCount(stats.descendants)}</p>
        <p className="text-subtle text-sm">
          {fill(copy.underLine, {
            direct: formatCount(stats.directChildren),
            total: formatCount(stats.descendants),
          })}
        </p>
      </Tile>
      <Tile label={copy.sales}>
        <p className="text-ink font-mono text-2xl tabular-nums">
          {formatCount(stats.sales.pending + stats.sales.finalized + stats.sales.refunded)}
        </p>
        <SalesChips stats={stats} />
      </Tile>
      <Tile label={copy.earned}>
        <dl className="grid gap-1 text-sm">
          {[
            { key: "pending", label: copy.pending, value: pending },
            { key: "claimable", label: copy.claimable, value: BigInt(stats.earned.claimable) },
            { key: "claimed", label: copy.claimed, value: BigInt(stats.earned.claimed) },
          ].map((row) => (
            <div key={row.key} className="flex flex-wrap justify-between gap-x-2">
              <dt className="text-subtle">{row.label}</dt>
              <dd className="text-ink font-mono tabular-nums">{money(row.value)}</dd>
            </div>
          ))}
        </dl>
      </Tile>
    </section>
  );
}
