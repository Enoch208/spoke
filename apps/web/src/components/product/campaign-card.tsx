import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatAmount, formatBps } from "@/lib/format";
import { CampaignArt } from "./campaign-art";
import { CampaignStateChip } from "./campaign-state-chip";

export function CampaignCard({
  campaign,
}: {
  campaign: ClientOutput<"campaigns.list">["items"][number];
}) {
  const image = campaign.product.media.find((asset) => asset.kind === "image")?.url;
  return (
    <Link
      href={`/c/${campaign.campaignId}`}
      className="group focus-visible:outline-ink block min-w-0 rounded-2xl"
    >
      <Card
        padding="none"
        className="ease-spring h-full overflow-hidden transition-[box-shadow,border-color] duration-[423ms] group-hover:border-line group-hover:shadow-[0_12px_32px_-16px_rgba(26,26,26,0.18)]"
      >
        <CampaignArt
          seed={campaign.campaignId}
          imageUrl={image}
          title={campaign.product.title}
          className="h-40"
        />
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-subtle min-w-0 flex-1 truncate text-sm"
              title={campaign.merchant.name}
            >
              {campaign.merchant.name}
            </p>
            <CampaignStateChip campaign={campaign} />
          </div>
          <div>
            <h2 className="font-display text-ink text-[22px] leading-tight font-medium tracking-[-0.01em]">
              {campaign.product.title}
            </h2>
            <p className="text-body mt-1.5 line-clamp-2 text-sm">{campaign.product.summary}</p>
          </div>
          <div className="border-hairline mt-auto flex items-center justify-between gap-2 border-t pt-3 text-sm">
            <span className="text-ink font-mono tabular-nums">
              {formatAmount(BigInt(campaign.price), campaign.token)}
            </span>
            <span className="text-body">
              {formatBps(campaign.policy.commissionBps)} commission ·{" "}
              {campaign.policy.maxRewardedAncestors}{" "}
              {campaign.policy.maxRewardedAncestors === 1 ? "level" : "levels"}
            </span>
          </div>
          <p className="text-subtle text-xs">
            {campaign.settledSales} settled {campaign.settledSales === 1 ? "sale" : "sales"} ·{" "}
            {formatAmount(BigInt(campaign.rewardAvailable), campaign.token)} reward budget left
          </p>
        </div>
      </Card>
    </Link>
  );
}
