"use client";

import type { ClientOutput } from "@spoke/protocol";
import { useClientQuery } from "@/lib/query/use-client";

export type CampaignCard = ClientOutput<"links.mine">["items"][number]["campaign"];
export type LinkRow = ClientOutput<"links.mine">["items"][number];

export function useMyLinks() {
  const links = useClientQuery("links.mine", { limit: 100 });
  const items = links.data?.items ?? [];
  return {
    query: links,
    items,
    campaignOf: (campaignId: string) =>
      items.find((link) => link.campaign.campaignId === campaignId)?.campaign,
    linkFor: (campaignId: string) => items.find((link) => link.campaign.campaignId === campaignId),
    isMine: (nodeId: string) => items.some((link) => link.nodeId === nodeId),
  };
}

export function CampaignName({
  campaignId,
  known,
  withMerchant = true,
}: {
  campaignId: string;
  known: CampaignCard | undefined;
  withMerchant?: boolean;
}) {
  const fetched = useClientQuery("campaigns.get", { campaignId }, { enabled: !known });
  const campaign = known ?? fetched.data;
  if (!campaign) return <span className="text-subtle">{`Campaign #${campaignId}`}</span>;
  return (
    <span className="min-w-0">
      <span className="text-ink font-medium">{campaign.product.title}</span>
      {withMerchant ? <span className="text-subtle"> · {campaign.merchant.name}</span> : null}
    </span>
  );
}
