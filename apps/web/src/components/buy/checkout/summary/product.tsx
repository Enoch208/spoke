import type { ClientOutput } from "@spoke/protocol";
import { CampaignArt } from "@/components/product/campaign-art";
import { Badge } from "@/components/ui/badge";
import { fill, globalStates } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { checkoutCopy } from "../../copy/checkout";

type Campaign = ClientOutput<"campaigns.get">;

const imageOf = (campaign: Campaign) =>
  campaign.product.media.find((asset) => asset.kind === "image")?.url;

function MerchantLink({ campaign, demo }: { campaign: Campaign; demo: boolean }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <a
        href={routeTo.merchant(campaign.merchant.slug)}
        target="_blank"
        rel="noreferrer"
        className="text-body hover:text-ink truncate underline-offset-2 transition-colors hover:underline"
      >
        {campaign.merchant.name}
      </a>
      {demo ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
    </span>
  );
}

export function ProductCard({ campaign, demo }: { campaign: Campaign; demo: boolean }) {
  return (
    <section className="bg-pill flex flex-col gap-2 rounded-3xl p-2">
      <div className="bg-surface border-hairline grid gap-5 rounded-2xl border p-4 sm:grid-cols-[200px_1fr] sm:p-5">
        <CampaignArt
          seed={campaign.campaignId}
          imageUrl={imageOf(campaign)}
          title={campaign.product.title}
          className="aspect-[4/3] w-full rounded-xl"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <MerchantLink campaign={campaign} demo={demo} />
          <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
            {campaign.product.title}
          </h2>
          <p className="text-body">{campaign.product.summary}</p>
          <p className="text-subtle text-sm">
            {fill(checkoutCopy.whatYouGet, {
              deliverable: checkoutCopy.deliverables[campaign.product.fulfillmentMode],
            })}
          </p>
        </div>
      </div>
      <PriceBlock campaign={campaign} />
    </section>
  );
}

export function ProductRow({ campaign, demo }: { campaign: Campaign; demo: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <CampaignArt
        seed={campaign.campaignId}
        imageUrl={imageOf(campaign)}
        title={campaign.product.title}
        className="size-14 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink line-clamp-2 font-medium">{campaign.product.title}</p>
        <div className="text-sm">
          <MerchantLink campaign={campaign} demo={demo} />
        </div>
      </div>
      <p className="text-ink shrink-0 text-right font-mono text-sm tabular-nums">
        {formatAmount(BigInt(campaign.price), campaign.token)}
      </p>
    </div>
  );
}

function PriceBlock({ campaign }: { campaign: Campaign }) {
  return (
    <div className="flex flex-col gap-1 px-4 pt-2 pb-3 sm:px-5">
      <p className="text-subtle text-sm">{checkoutCopy.youPay}</p>
      <p className="text-ink text-h4 font-mono break-words tabular-nums">
        {formatAmount(BigInt(campaign.price), campaign.token)}
        <span className="text-subtle text-base whitespace-nowrap"> · testnet</span>
      </p>
      <p className="text-body text-sm">{checkoutCopy.feeLine}</p>
      <p className="text-subtle text-sm">{checkoutCopy.demoToken}</p>
    </div>
  );
}
