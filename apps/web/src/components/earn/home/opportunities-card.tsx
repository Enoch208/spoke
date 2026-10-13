"use client";

import Link from "next/link";
import { CampaignArt } from "@/components/product/campaign-art";
import { Button } from "@/components/ui/button";
import { rewardAtPrice } from "@/components/public/shared/policy-math";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { homeCopy } from "../copy/home";
import { opportunitiesCopy } from "../copy/opportunities";
import { useRecordCategories } from "../opportunities/record-categories";
import { Section } from "../shared/section";

const copy = homeCopy.opportunities;

export function OpportunitiesCard() {
  const open = useUiStore((state) => state.open);
  const record = useRecordCategories();
  const list = useClientQuery("campaigns.list", {
    limit: 30,
    excludeJoined: true,
    sort: "balanced",
  });
  const invitations = useClientQuery("invitations.mine", { status: "pending" });
  const items = list.data?.items ?? [];
  const matching = items.filter((item) => record.ids.has(item.product.category));
  const shown = (matching.length > 0 ? matching : items).slice(0, 3);
  const pending = invitations.data?.items.length ?? 0;
  return (
    <Section
      title={copy.title}
      padding="none"
      actions={
        <Link
          href={routes.earn.opportunities}
          className="text-ink text-sm underline underline-offset-2"
        >
          {copy.browse}
        </Link>
      }
    >
      <ul className="divide-hairline divide-y px-2">
        {shown.map((campaign) => (
          <li key={campaign.campaignId} className="flex items-center gap-3 px-3 py-3">
            <CampaignArt
              seed={campaign.campaignId}
              imageUrl={campaign.product.media[0]?.url}
              title={campaign.product.title}
              className="size-12 shrink-0 rounded-xl"
            />
            <Link
              href={routeTo.campaign(campaign.campaignId)}
              className="group grid min-w-0 flex-1 gap-0.5"
            >
              <span className="text-ink group-hover:text-body truncate font-medium">
                {campaign.product.title}
              </span>
              <span className="text-subtle truncate text-sm">
                {campaign.merchant.name} · {formatBps(campaign.policy.commissionBps)} ·{" "}
                {formatAmount(
                  rewardAtPrice(BigInt(campaign.price), campaign.policy),
                  campaign.token,
                )}
              </span>
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => open("M-12", { campaignId: campaign.campaignId })}
            >
              {opportunitiesCopy.card.create}
            </Button>
          </li>
        ))}
      </ul>
      {pending > 0 ? (
        <Link
          href={routes.earn.invitations}
          className="bg-lilac-soft text-ink mx-5 mt-2 mb-5 block rounded-xl px-4 py-3 text-sm font-medium"
        >
          {pending === 1 ? copy.invitation : fill(copy.invitations, { n: String(pending) })}
        </Link>
      ) : (
        <div className="h-3" />
      )}
    </Section>
  );
}
