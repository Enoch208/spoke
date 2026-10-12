import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatAmount, formatBps } from "@/lib/format";

export function CampaignCard({
  campaign,
}: {
  campaign: ClientOutput<"campaigns.list">["items"][number];
}) {
  return (
    <Link href={`/c/${campaign.campaignId}`} className="group block min-w-0">
      <Card padding="none" className="overflow-hidden transition-shadow hover:shadow-sm">
        <div className="bg-lilac-soft flex h-36 items-center justify-center overflow-hidden">
          <span className="font-display text-h3 text-olive">
            {campaign.product.title.slice(0, 1)}
          </span>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-subtle min-w-0 flex-1 truncate text-sm"
              title={campaign.merchant.name}
            >
              {campaign.merchant.name}
            </p>
            <span className="bg-pill shrink-0 rounded-full px-2 py-1 text-xs">
              {campaign.state.replaceAll("_", " ")}
            </span>
          </div>
          <h2 className="font-display text-h4 group-hover:underline">{campaign.product.title}</h2>
          <p className="text-body line-clamp-2 text-sm">{campaign.product.summary}</p>
          <div className="border-hairline flex flex-wrap justify-between gap-2 border-t pt-3 text-sm">
            <span className="font-mono">
              {formatAmount(BigInt(campaign.price), campaign.token)}
            </span>
            <span>
              {formatBps(campaign.policy.commissionBps)} reward ·{" "}
              {campaign.policy.maxRewardedAncestors} levels
            </span>
          </div>
          <p className="text-subtle text-xs">
            {campaign.settledSales} settled sales ·{" "}
            {formatAmount(BigInt(campaign.rewardAvailable), campaign.token)} reward budget available
          </p>
        </div>
      </Card>
    </Link>
  );
}
