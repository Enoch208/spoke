"use client";

import type { ClientOutput } from "@spoke/protocol";
import type { ReactNode } from "react";
import { useClientContext } from "@/lib/client/provider";
import { common, fill } from "@/lib/copy";
import { formatAmount, formatCount, formatDateRange, type TokenLike } from "@/lib/format";
import { reputationCopy as copy } from "../copy/reputation";

function Tile({ label, value, mono = true }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="bg-surface border-hairline grid content-start gap-1.5 rounded-2xl border p-4">
      <dt className="text-subtle text-sm">{label}</dt>
      <dd
        className={
          mono ? "text-ink font-mono text-xl tabular-nums break-words" : "text-ink text-base"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function RecordTiles({
  profile,
  token,
  refundedCount,
}: {
  profile: ClientOutput<"reputation.mine">;
  token: TokenLike | null;
  refundedCount: number;
}) {
  const { mode } = useClientContext();
  const money = (value: string) => (token ? formatAmount(BigInt(value), token) : "See receipts");
  const { from, to } = profile.evidencePeriod;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label={copy.tiles.settled} value={formatCount(profile.settledConversions)} />
      <Tile label={copy.tiles.merchants} value={formatCount(profile.merchantCount)} />
      <Tile label={copy.tiles.campaigns} value={formatCount(profile.campaignCount)} />
      <Tile label={copy.tiles.commission} value={money(profile.settledCommission)} />
      <Tile label={copy.tiles.value} value={money(profile.netAttributedValue)} />
      <Tile
        label={copy.tiles.refunds}
        mono={false}
        value={
          refundedCount === 1
            ? copy.tiles.refundsOne
            : fill(copy.tiles.refundsLine, { n: formatCount(refundedCount) })
        }
      />
      <Tile
        label={copy.tiles.period}
        mono={false}
        value={from && to ? formatDateRange(new Date(from), new Date(to)) : "—"}
      />
      <Tile
        label={copy.tiles.block}
        mono={mode === "live"}
        value={
          mode === "demo"
            ? common.simulated
            : profile.lastIndexedBlock
              ? formatCount(BigInt(profile.lastIndexedBlock))
              : "—"
        }
      />
    </dl>
  );
}
