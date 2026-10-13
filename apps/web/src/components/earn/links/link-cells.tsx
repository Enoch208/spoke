"use client";

import type { ClientOutput } from "@spoke/protocol";
import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { personLabel } from "@/components/graph/person";
import { fill } from "@/lib/copy";
import { formatAmount, formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";
import { linksPageCopy as copy } from "../copy/links-page";
import type { LinkRow } from "../shared/campaigns";

export type LinkStats = ClientOutput<"links.stats">;

export function PositionLine({ link }: { link: LinkRow }) {
  const root = link.parentNodeId === "0";
  const ancestry = useClientQuery(
    "graph.ancestry",
    { nodeId: link.nodeId, chainId: activeChain.id },
    { enabled: !root },
  );
  if (root) return <>{copy.root}</>;
  const parent = ancestry.data?.nodes[1];
  if (!parent) return <>{fill(copy.level, { n: String(link.levelFromMerchant) })}</>;
  return (
    <>
      {fill(copy.under, {
        parent: personLabel(parent.owner),
        n: String(link.levelFromMerchant),
      })}
    </>
  );
}

export function ProductLink({ link }: { link: LinkRow }) {
  return (
    <Link
      href={routeTo.link(link.nodeId)}
      className="text-ink hover:text-body grid min-w-0 transition-colors duration-[423ms]"
    >
      <span className="line-clamp-2 font-medium">{link.campaign.product.title}</span>
      <span className="text-subtle truncate text-sm">{link.campaign.merchant.name}</span>
    </Link>
  );
}

export const salesLine = (stats: LinkStats) =>
  fill(copy.salesLine, {
    pending: formatCount(stats.sales.pending),
    settled: formatCount(stats.sales.finalized),
    refunded: formatCount(stats.sales.refunded),
  });

const countTone = {
  pending: { icon: Clock01Icon, className: "bg-amber-soft text-amber-ink" },
  settled: { icon: CheckmarkBadge01Icon, className: "bg-lime-soft text-lime-ink" },
  refunded: { icon: ArrowTurnBackwardIcon, className: "bg-pink-soft text-pink-ink" },
} as const;

export function SalesChips({ stats }: { stats: LinkStats | undefined }) {
  if (!stats) return <Skeleton className="inline-block h-6 w-28 rounded-full" />;
  const counts = {
    pending: stats.sales.pending,
    settled: stats.sales.finalized,
    refunded: stats.sales.refunded,
  };
  return (
    <span
      className="inline-flex gap-1 whitespace-nowrap"
      aria-label={salesLine(stats)}
      role="group"
    >
      {(Object.keys(counts) as (keyof typeof counts)[]).map((key) => (
        <span
          key={key}
          title={`${formatCount(counts[key])} ${copy.salesWords[key]}`}
          className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium ${countTone[key].className}`}
        >
          <HugeiconsIcon icon={countTone[key].icon} size={13} strokeWidth={2} aria-hidden="true" />
          <span className="tabular-nums">{formatCount(counts[key])}</span>
          <span className="sr-only">{copy.salesWords[key]}</span>
        </span>
      ))}
    </span>
  );
}

export function EarnedCell({ link }: { link: LinkRow }) {
  const owed = BigInt(link.earned.claimable) + BigInt(link.earned.claimed);
  const pending = BigInt(link.earned.atRisk) + BigInt(link.earned.readyToFinalize);
  return (
    <span className="grid justify-items-end">
      <span className="text-ink font-mono tabular-nums">
        {formatAmount(owed, link.campaign.token)}
      </span>
      {pending > 0n ? (
        <span className="text-subtle text-xs">
          {fill(copy.earnedPending, { amount: formatAmount(pending, link.campaign.token) })}
        </span>
      ) : null}
    </span>
  );
}

export function StatsValue({
  stats,
  pick,
}: {
  stats: LinkStats | undefined;
  pick: (stats: LinkStats) => string;
}) {
  return stats ? <>{pick(stats)}</> : <Skeleton className="inline-block h-4 w-10" />;
}
