"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { profileCopy } from "../copy/profile";
import type { AnyProfile } from "./types";

const views = ["merchant", "campaign"] as const;
type View = (typeof views)[number];

function CampaignName({ campaignId, merchant }: { campaignId: string; merchant: boolean }) {
  const campaign = useClientQuery("campaigns.get", { campaignId });
  if (!campaign.data) return <Skeleton className="h-4 w-40" />;
  if (merchant)
    return (
      <Link
        href={routeTo.merchant(campaign.data.merchant.slug)}
        className="text-ink hover:text-body truncate"
      >
        {campaign.data.merchant.name}
      </Link>
    );
  return (
    <Link href={routeTo.campaign(campaignId)} className="text-ink hover:text-body truncate">
      {campaign.data.product.title}
    </Link>
  );
}

function Rows({
  rows,
  merchant,
}: {
  rows: { key: string; campaignId: string; settled: number }[];
  merchant: boolean;
}) {
  return (
    <ul className="divide-hairline flex flex-col divide-y">
      <li className="text-subtle flex justify-between gap-3 pb-2 text-sm">
        <span>{profileCopy.name}</span>
        <span>{profileCopy.tiles.settled}</span>
      </li>
      {rows.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-3 py-3 text-sm">
          <span className="min-w-0 truncate">
            <CampaignName campaignId={row.campaignId} merchant={merchant} />
          </span>
          <span className="text-ink font-mono tabular-nums">{formatCount(row.settled)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Breakdown({ profile }: { profile: AnyProfile }) {
  const [view, setView] = useState<View>("merchant");
  if (profile.perCampaign.length === 0) return null;
  const campaignOfReceipt = new Map(
    profile.perCampaign.flatMap((group) => group.receiptIds.map((id) => [id, group.campaignId])),
  );
  const merchantRows = profile.perMerchant.flatMap((group) => {
    const campaignId = group.receiptIds
      .map((id) => campaignOfReceipt.get(id))
      .find((id) => id !== undefined);
    return campaignId
      ? [{ key: group.merchantId, campaignId, settled: group.settledConversions }]
      : [];
  });
  const campaignRows = profile.perCampaign.map((group) => ({
    key: group.campaignId,
    campaignId: group.campaignId,
    settled: group.settledConversions,
  }));
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-display text-h4 text-ink font-medium">{profileCopy.breakdown}</h2>
      <Tabs value={view} onValueChange={setView} values={views}>
        <TabList
          value={view}
          label={profileCopy.breakdown}
          items={[
            { value: "merchant", label: profileCopy.byMerchant, count: merchantRows.length },
            { value: "campaign", label: profileCopy.byCampaign, count: campaignRows.length },
          ]}
        />
        <TabPanel value="merchant">
          <Rows rows={merchantRows} merchant />
        </TabPanel>
        <TabPanel value="campaign">
          <Rows rows={campaignRows} merchant={false} />
        </TabPanel>
      </Tabs>
    </Card>
  );
}
