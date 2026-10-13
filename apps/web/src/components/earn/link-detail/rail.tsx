"use client";

import Link from "next/link";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { CampaignArt } from "@/components/product/campaign-art";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatAmount, formatBps, formatDuration } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { linkDetailCopy } from "../copy/link-detail";
import type { CampaignCard } from "../shared/campaigns";

const copy = linkDetailCopy.rail;

export function CampaignRail({ campaign }: { campaign: CampaignCard }) {
  const total = BigInt(campaign.rewardTotal);
  const left = BigInt(campaign.rewardAvailable);
  const percent = total === 0n ? 0 : Number((left * 10_000n) / total);
  return (
    <Link
      href={routeTo.campaign(campaign.campaignId)}
      className="bg-surface border-hairline hover:border-line ease-spring grid gap-4 rounded-2xl border p-4 transition-colors duration-[423ms]"
    >
      <CampaignArt
        seed={campaign.campaignId}
        imageUrl={campaign.product.media[0]?.url}
        title={campaign.product.title}
        className="aspect-[4/3] w-full rounded-xl"
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-ink font-medium">{campaign.product.title}</p>
        <CampaignStateChip campaign={campaign} />
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-subtle">{copy.price}</dt>
          <dd className="text-ink font-mono tabular-nums">
            {formatAmount(BigInt(campaign.price), campaign.token)}
          </dd>
        </div>
        <div className="grid gap-1.5">
          <div className="flex justify-between gap-2">
            <dt className="text-subtle">{copy.budget}</dt>
            <dd className="text-ink font-mono tabular-nums">{formatBps(percent)}</dd>
          </div>
          <ProgressBar
            value={percent}
            max={10_000}
            label={copy.budget}
            valueText={formatAmount(left, campaign.token)}
            tone="lime"
          />
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-subtle">{copy.hold}</dt>
          <dd className="text-ink">{formatDuration(campaign.policy.holdSeconds)}</dd>
        </div>
      </dl>
      <span className="text-ink text-sm font-medium underline underline-offset-2">{copy.open}</span>
    </Link>
  );
}
