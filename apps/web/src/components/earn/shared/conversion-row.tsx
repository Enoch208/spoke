"use client";

import type { ClientOutput } from "@spoke/protocol";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps, formatRelative } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { earningsCopy } from "../copy/earnings";
import { CampaignName, type CampaignCard } from "./campaigns";
import { MoneyStateChip } from "./money-state-chip";

export type Conversion = ClientOutput<"earnings.byConversion">["items"][number];

export const purchasedAt = (row: Conversion) => row.evidence[0]?.at ?? null;

export const placeLine = (row: Conversion) =>
  `${fill(earningsCopy.bySale.levelOf, { level: String(row.level), count: String(row.pathLength) })} · ${formatBps(row.effectiveWeightBps)}`;

export const cancelled = (row: Conversion) => row.state === "refunded" || row.state === "reversed";

export function ConversionRow({
  row,
  campaign,
  now,
  showCampaign = true,
}: {
  row: Conversion;
  campaign: CampaignCard | undefined;
  now: number;
  showCampaign?: boolean;
}) {
  const open = useUiStore((state) => state.open);
  const at = purchasedAt(row);
  return (
    <li>
      <button
        type="button"
        onClick={() => open("M-16", { saleId: row.saleId })}
        className="hover:bg-soft ease-spring grid w-full cursor-pointer gap-2 rounded-xl px-3 py-3 text-left transition-colors duration-[423ms]"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0 text-sm">
            {showCampaign ? (
              <CampaignName campaignId={row.campaignId} known={campaign} />
            ) : (
              <span className="text-ink font-medium">#{row.saleId}</span>
            )}
          </span>
          <span
            className={cx(
              "text-ink shrink-0 font-mono text-sm tabular-nums",
              cancelled(row) && "text-subtle line-through",
            )}
          >
            {formatAmount(BigInt(row.amount), row.token)}
          </span>
        </span>
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-subtle text-sm">
            {showCampaign ? `#${row.saleId} · ` : ""}
            {placeLine(row)}
            {at ? ` · ${formatRelative(new Date(at), { now: new Date(now) })}` : ""}
          </span>
          <MoneyStateChip
            state={row.state}
            unlockAt={row.unlockAt}
            finalizedAt={row.finalizedAt}
            claimTxHash={row.claimTxHash}
            now={now}
          />
        </span>
      </button>
    </li>
  );
}
