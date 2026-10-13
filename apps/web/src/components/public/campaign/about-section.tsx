import type { CampaignDetail } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { formatCountdown } from "@/lib/format";
import { campaignCopy } from "../copy/campaign";

export function AboutSection({ campaign }: { campaign: CampaignDetail }) {
  const product = campaign.product;
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-display text-h4 text-ink font-medium">{campaignCopy.about.heading}</h2>
      <p className="text-body whitespace-pre-wrap">{product.description || product.summary}</p>
      <dl className="border-hairline flex flex-col gap-3 border-t pt-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-subtle">{campaignCopy.about.whatYouGet}</dt>
          <dd className="text-ink">{campaignCopy.about.delivery[product.fulfillmentMode]}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-subtle">{campaignCopy.about.refunds}</dt>
          <dd className="text-ink">{product.refundPolicy}</dd>
          <dd className="text-body">
            {fill(campaignCopy.about.refundWindow, {
              hold: formatCountdown(campaign.policy.holdSeconds),
            })}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
