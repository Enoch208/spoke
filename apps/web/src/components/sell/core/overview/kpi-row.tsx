"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { demoToken } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { ModeBadge } from "@/components/ui/mode-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip } from "@/components/ui/tooltip";
import { campaignModifierCopy, campaignStateCopy, fill } from "@/lib/copy";
import { formatAmount, formatBps } from "@/lib/format";
import { overviewPageCopy } from "../copy/overview";
import { coveredCount } from "../campaigns/campaign-view";
import { useIsDemo } from "../shared/hooks";
import { budgetHealth, netValue, rewardCostBps, type HealthRow, type SettledTotals } from "./kpis";

const copy = overviewPageCopy.kpis;

function KpiCard({
  label,
  tip,
  href,
  value,
  note,
}: {
  label: string;
  tip?: string;
  href?: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  const demo = useIsDemo();
  const body = (
    <Card
      padding="sm"
      className={`flex h-full min-w-0 flex-col gap-1.5 sm:p-5 ${href ? "hover:border-line transition-colors duration-[423ms] ease-spring" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-subtle flex items-center gap-1 text-sm">
          {label}
          {tip ? (
            <Tooltip content={tip}>
              <span tabIndex={0} aria-label={tip} className="text-faint inline-flex">
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={14}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>
            </Tooltip>
          ) : null}
        </p>
        {demo ? <ModeBadge mode="demo" /> : null}
      </div>
      <div className="text-ink font-mono text-base tabular-nums [overflow-wrap:anywhere] sm:text-2xl">
        {value}
      </div>
      {note ? <div className="text-subtle text-xs leading-relaxed sm:text-sm">{note}</div> : null}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function KpiRow({
  totals,
  obligations,
  health,
  counts,
}: {
  totals: SettledTotals | null;
  obligations: { reserved: bigint; owed: bigint } | null;
  health: readonly HealthRow[];
  counts: { live: number; paused: number; drafts: number; ended: number };
}) {
  const token = demoToken;
  const loading = <Skeleton className="h-7 w-32" />;
  const ratio = totals ? rewardCostBps(totals) : null;
  const summary = budgetHealth(health);
  const chip =
    summary.exhausted > 0
      ? {
          ...campaignStateCopy.exhausted,
          label: fill(copy.exhausted, { n: String(summary.exhausted) }),
        }
      : summary.low > 0
        ? { ...campaignModifierCopy.budgetLow, label: fill(copy.low, { n: String(summary.low) }) }
        : { ...campaignStateCopy.live, label: copy.healthy };
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <KpiCard
        label={copy.settled}
        tip={copy.settledTip}
        value={totals ? formatAmount(totals.value, token) : loading}
        note={copy.settledNote}
      />
      <KpiCard
        label={copy.net}
        value={totals ? formatAmount(netValue(totals), token) : loading}
        note={copy.netNote}
      />
      <KpiCard
        label={copy.ratio}
        value={totals ? (ratio === null ? "—" : formatBps(ratio)) : loading}
        note={ratio === null && totals ? copy.ratioEmpty : copy.ratioNote}
      />
      <KpiCard
        label={copy.obligations}
        href="/sell/vault"
        value={obligations ? formatAmount(obligations.reserved + obligations.owed, token) : loading}
        note={
          obligations ? (
            <>
              {fill(copy.obligationsLine, {
                reserved: formatAmount(obligations.reserved, token),
                owed: formatAmount(obligations.owed, token),
              })}
              <br />
              {copy.obligationsNote}
            </>
          ) : null
        }
      />
      <KpiCard
        label={copy.health}
        href="/sell/vault"
        value={formatAmount(summary.available, token)}
        note={
          <span className="flex flex-wrap items-center gap-2">
            {summary.liveCount > 0 ? (
              <StatusChip label={chip.label} icon={chip.icon} tone={chip.tone} />
            ) : null}
            {summary.lowest !== null
              ? fill(copy.lowest, { covered: coveredCount(summary.lowest) })
              : null}
          </span>
        }
      />
      <KpiCard
        label={copy.active}
        href="/sell/campaigns?tab=live"
        value={counts.live}
        note={fill(copy.activeLine, {
          p: String(counts.paused),
          d: String(counts.drafts),
          e: String(counts.ended),
        })}
      />
    </div>
  );
}
