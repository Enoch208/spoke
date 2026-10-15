"use client";

import { Link01Icon, Share08Icon } from "@hugeicons/core-free-icons";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCopy } from "@/components/ui/use-copy";
import { PageSkeleton, ProductPage, QueryState } from "@/components/product/page";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { publicNetworkCopy as copy } from "@/components/graph/copy";
import { Explorer } from "@/components/graph/explorer";
import { NetworkActivity } from "@/components/graph/network-activity";
import { useSelf } from "@/components/graph/use-self";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";

function PublicNetwork({ campaignId }: { campaignId: string }) {
  const self = useSelf();
  const copyText = useCopy();
  const open = useUiStore((state) => state.open);
  const campaign = useClientQuery("campaigns.get", { campaignId }, { refetchInterval: 20_000 });
  const stats = useClientQuery("campaigns.stats", { campaignId }, { refetchInterval: 20_000 });
  const policy = useClientQuery("campaigns.policy", { campaignId });
  const data = campaign.data;
  const mine = self.links.find((link) => link.campaign.campaignId === campaignId);
  const sales = stats.data
    ? stats.data.sales.pending + stats.data.sales.finalized + stats.data.sales.refunded
    : null;
  return (
    <ProductPage
      title={copy.title}
      breadcrumbs={data ? [{ label: data.product.title, href: routeTo.campaign(campaignId) }] : []}
      description={
        stats.data && sales !== null
          ? fill(copy.counts, { links: formatCount(stats.data.links), sales: formatCount(sales) })
          : undefined
      }
      actions={
        <>
          {data ? <CampaignStateChip campaign={data} size="md" /> : null}
          <Button
            variant="secondary"
            icon={Share08Icon}
            onClick={() => void copyText(window.location.href, copy.viewCopied)}
          >
            {copy.shareView}
          </Button>
        </>
      }
    >
      <QueryState
        pending={campaign.isPending}
        error={campaign.error}
        retry={() => void campaign.refetch()}
      >
        {data?.moderation.hidden ? (
          <EmptyState variant="page" title={copy.hidden} />
        ) : data && data.nodeCount === 0 ? (
          <EmptyState
            variant="page"
            icon={Link01Icon}
            title={copy.emptyTitle}
            body={copy.emptyBody}
            actions={
              <Button onClick={() => open("M-12", { campaignId })}>{copy.createFirst}</Button>
            }
          />
        ) : data ? (
          <>
            <Explorer
              earn={false}
              campaignId={campaignId}
              campaignName={data.product.title}
              merchant={data.merchant.name}
              myNodeId={null}
              myLevel={mine?.levelFromMerchant ?? 0}
              selfNodes={self.nodeIds}
              visited={new Set()}
              campaignSelect={null}
              summary={null}
              canJoin={!mine}
            />
            <section className="bg-pill grid gap-2 rounded-3xl p-5 text-sm">
              <h2 className="text-ink font-medium">{copy.aboutTitle}</h2>
              <p className="text-body">
                {fill(copy.about, {
                  n: String(
                    policy.data?.current.maxRewardedAncestors ?? data.policy.maxRewardedAncestors,
                  ),
                })}
              </p>
              <p className="text-subtle">{copy.privacy}</p>
            </section>
          </>
        ) : null}
      </QueryState>
      {data && !data.moderation.hidden ? <NetworkActivity campaignId={campaignId} /> : null}
    </ProductPage>
  );
}

export function NetworkPage({ campaignId }: { campaignId: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicNetwork campaignId={decodeURIComponent(campaignId)} />
    </Suspense>
  );
}
