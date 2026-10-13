"use client";

import { Store01Icon } from "@hugeicons/core-free-icons";
import { CampaignCard, type CampaignCardData } from "@/components/product/campaign-card";
import { LoadingSkeleton } from "@/components/product/page";
import { EmptyState } from "@/components/ui/empty-state";
import { TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { merchantCopy } from "../copy/merchant";
import { SectionError } from "../shared/section-error";
import { useUrlParams } from "../shared/use-url-params";
import { usePersonalMarks, usePublicViewer } from "../shared/viewer";

const tabs = ["live", "paused", "ended"] as const;
type Tab = (typeof tabs)[number];

const isTab = (value: string | null): value is Tab => tabs.some((tab) => tab === value);

export function useMerchantOffers(slug: string) {
  const query = (status: "active" | "paused" | "ended" | "expired") =>
    ({ merchant: slug, status, limit: 48 }) as const;
  const live = useClientQuery("campaigns.list", query("active"));
  const paused = useClientQuery("campaigns.list", query("paused"));
  const ended = useClientQuery("campaigns.list", query("ended"));
  const expired = useClientQuery("campaigns.list", query("expired"));
  const all = [live, paused, ended, expired];
  const groups: Record<Tab, CampaignCardData[]> = {
    live: live.data?.items ?? [],
    paused: paused.data?.items ?? [],
    ended: [...(ended.data?.items ?? []), ...(expired.data?.items ?? [])],
  };
  return {
    groups,
    tokens: [...groups.live, ...groups.paused, ...groups.ended].map((card) => card.token),
    pending: all.some((item) => item.isPending),
    failed: all.some((item) => item.error),
    retry: () => {
      for (const item of all) void item.refetch();
    },
  };
}

export type MerchantOffers = ReturnType<typeof useMerchantOffers>;

export function OfferTabs({ offers, name }: { offers: MerchantOffers; name: string }) {
  const { params, set } = useUrlParams();
  const { known } = usePublicViewer();
  const marks = usePersonalMarks(known);
  if (offers.pending) return <LoadingSkeleton shape="cards" />;
  if (offers.failed) return <SectionError retry={offers.retry} />;
  const groups = offers.groups;
  const shown = tabs.filter((tab) => groups[tab].length > 0);
  const requested = params.get("tab");
  const active = isTab(requested) && shown.includes(requested) ? requested : (shown[0] ?? "live");
  if (shown.length === 0)
    return <EmptyState icon={Store01Icon} title={fill(merchantCopy.noOffers, { name })} />;
  return (
    <Tabs
      value={active}
      values={tabs}
      onValueChange={(tab) => {
        set({ tab: tab === "live" ? null : tab }, "replace");
      }}
    >
      <TabList
        value={active}
        label={merchantCopy.offers}
        items={shown.map((tab) => ({
          value: tab,
          label: merchantCopy.tabs[tab],
          count: groups[tab].length,
        }))}
      />
      {groups.live.length === 0 ? (
        <p className="text-subtle text-sm">{fill(merchantCopy.noOpen, { name })}</p>
      ) : null}
      {shown.map((tab) => (
        <TabPanel key={tab} value={tab}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups[tab].map((campaign) => (
              <CampaignCard
                key={campaign.campaignId}
                campaign={campaign}
                hasLink={marks.linkFor(campaign.campaignId) !== null}
                purchased={marks.purchased(campaign.campaignId)}
              />
            ))}
          </div>
        </TabPanel>
      ))}
    </Tabs>
  );
}
