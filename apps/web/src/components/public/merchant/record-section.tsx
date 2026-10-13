"use client";

import { demoToken } from "@spoke/protocol";
import type { ReactNode } from "react";
import { Amount } from "@/components/ui/amount";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatBps, formatCount, formatDuration, type TokenLike } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { merchantCopy } from "../copy/merchant";
import { SectionError } from "../shared/section-error";

function Tile({ label, value, caption }: { label: string; value: ReactNode; caption?: string }) {
  return (
    <div className="bg-soft flex flex-col gap-1.5 rounded-2xl p-4">
      <p className="text-subtle text-sm">{label}</p>
      <div className="text-ink font-mono text-lead tabular-nums">{value}</div>
      {caption ? <p className="text-subtle text-sm">{caption}</p> : null}
    </div>
  );
}

export function RecordSection({ slug, tokens }: { slug: string; tokens: readonly TokenLike[] }) {
  const { mode } = useClientContext();
  const record = useClientQuery("merchants.record", { slug });
  const symbols = new Set(tokens.map((token) => token.symbol));
  const token = symbols.size > 1 ? null : (tokens[0] ?? demoToken);
  const money = (value: string, testnet = false) =>
    token ? <Amount amount={BigInt(value)} token={token} testnet={testnet} size="lead" /> : null;
  const data = record.data;
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-h4 text-ink font-medium">{merchantCopy.record}</h2>
        <p className="text-subtle text-sm">
          {merchantCopy.recordSubtitle}
          {mode === "live" && data?.indexedBlock
            ? ` ${fill(merchantCopy.recordBlock, { block: formatCount(BigInt(data.indexedBlock)) })}`
            : ""}
        </p>
      </div>
      {record.isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : record.error || !data ? (
        <SectionError retry={() => void record.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label={merchantCopy.tiles.settled} value={formatCount(data.sales.finalized)} />
            <Tile
              label={merchantCopy.tiles.refunded}
              value={formatCount(data.sales.refunded)}
              caption={fill(merchantCopy.tiles.refundRate, { rate: formatBps(data.refundRateBps) })}
            />
            <Tile
              label={merchantCopy.tiles.medianRefund}
              value={
                data.medianRefundSeconds === null
                  ? merchantCopy.noMedian
                  : formatDuration(data.medianRefundSeconds)
              }
              caption={merchantCopy.tiles.medianCaption}
            />
            <Tile label={merchantCopy.tiles.pending} value={formatCount(data.sales.pending)} />
            {token ? (
              <>
                <Tile
                  label={merchantCopy.tiles.funded}
                  value={money(data.rewardsDeposited, true)}
                />
                <Tile label={merchantCopy.tiles.earned} value={money(data.rewardsEarned)} />
                <Tile label={merchantCopy.tiles.withdrawn} value={money(data.rewardsWithdrawn)} />
              </>
            ) : null}
          </div>
          {data.sales.finalized + data.sales.refunded === 0 ? (
            <p className="text-subtle text-sm">{merchantCopy.noSales}</p>
          ) : null}
          <p className="text-body text-sm">{merchantCopy.refundLine}</p>
        </>
      )}
    </Card>
  );
}
