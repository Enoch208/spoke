"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { CampaignDetail } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModeBadge } from "@/components/ui/mode-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useCopy } from "@/components/ui/use-copy";
import { CampaignArt } from "@/components/product/campaign-art";
import { fill, vaultRewardCopy } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { campaignsCopy } from "../copy/campaigns";
import { overviewCopy as copy } from "../copy/campaign";
import { coveredText } from "../campaigns/campaign-view";
import { Callout } from "../shared/callout";
import { useIsDemo } from "../shared/hooks";
import { committed, shareOf, type RewardBuckets } from "../shared/ledger";
import { ActivityFeed } from "./activity-feed";
import { SalesChart } from "./sales-chart";

function Kpi({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
  const demo = useIsDemo();
  return (
    <Card padding="sm" className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-subtle text-sm">{label}</p>
        {demo ? <ModeBadge mode="demo" /> : null}
      </div>
      <div className="text-ink font-mono text-base tabular-nums [overflow-wrap:anywhere] sm:text-xl">
        {children}
      </div>
      {note ? <div className="text-subtle text-xs leading-relaxed">{note}</div> : null}
    </Card>
  );
}

export function OverviewTab({
  data,
  buckets,
  reward,
  liabilityCap,
}: {
  data: CampaignDetail;
  buckets: RewardBuckets | null;
  reward: bigint;
  liabilityCap: bigint;
}) {
  const stats = useClientQuery("campaigns.stats", { campaignId: data.campaignId });
  const copyText = useCopy();
  const token = data.token;
  const counts = stats.data?.sales ?? data.counts;
  const noSales = counts.pending + counts.finalized + counts.refunded === 0;
  return (
    <div className="space-y-6">
      {noSales ? (
        <Callout
          tone="info"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void copyText(
                  `${window.location.origin}${routeTo.campaign(data.campaignId)}`,
                  campaignsCopy.linkCopied,
                );
              }}
            >
              {copy.copyLink}
            </Button>
          }
        >
          {copy.noSales}
        </Callout>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi label={copy.settledValue} note={copy.settledValueNote}>
          {stats.data ? formatAmount(BigInt(stats.data.settledValue), token) : "—"}
        </Kpi>
        <Kpi
          label={copy.sales}
          note={fill(copy.salesLine, {
            pending: String(counts.pending),
            finalized: String(counts.finalized),
            refunded: String(counts.refunded),
          })}
        >
          {counts.pending + counts.finalized + counts.refunded}
        </Kpi>
        <Kpi
          label={copy.rewards}
          note={
            buckets ? (
              <span className="flex flex-col">
                {(["pendingReserved", "vestedUnclaimed", "rewardsClaimed"] as const).map((key) => (
                  <span key={key}>
                    {vaultRewardCopy[key].label} {formatAmount(buckets[key], token)}
                  </span>
                ))}
              </span>
            ) : null
          }
        >
          {buckets ? formatAmount(committed(buckets), token) : "—"}
        </Kpi>
        <Kpi
          label={copy.budgetLeft}
          note={
            buckets ? (
              <span className="flex flex-col gap-1.5">
                <ProgressBar
                  value={shareOf(buckets.available, liabilityCap)}
                  max={100}
                  label={campaignsCopy.budgetBar}
                  tone="lime"
                  className="h-1.5"
                />
                {coveredText(buckets.available, reward)}
              </span>
            ) : null
          }
        >
          {buckets ? formatAmount(buckets.available, token) : "—"}
        </Kpi>
        <Kpi
          label={copy.distributors}
          note={
            stats.data
              ? fill(copy.distributorsLine, {
                  branches: String(stats.data.branches),
                  depth: String(stats.data.deepestLevel),
                })
              : null
          }
        >
          {stats.data?.links ?? data.nodeCount}
        </Kpi>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <SalesChart campaignId={data.campaignId} />
        </div>
        <ActivityFeed campaignId={data.campaignId} token={token} />
      </div>
      <Card padding="none" className="flex flex-col overflow-hidden sm:flex-row">
        <CampaignArt
          seed={data.campaignId}
          imageUrl={data.product.media[0]?.url}
          title={data.product.title}
          className="h-32 sm:h-auto sm:w-48"
        />
        <div className="flex flex-1 flex-col gap-2 p-5">
          <p className="text-subtle text-sm">{copy.product}</p>
          <h2 className="font-display text-h4 text-ink font-medium">{data.product.title}</h2>
          <p className="text-body text-sm">{data.product.outcome || data.product.summary}</p>
          <p className="text-subtle text-sm">
            {copy.price}{" "}
            <span className="text-ink font-mono tabular-nums">
              {formatAmount(BigInt(data.price), token, { testnet: true })}
            </span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" variant="secondary">
              <Link href={routeTo.product(data.product.id)}>{copy.editProduct}</Link>
            </Button>
            <span className="text-subtle text-xs">
              {fill(copy.productNote, { v: String(data.product.version) })}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
