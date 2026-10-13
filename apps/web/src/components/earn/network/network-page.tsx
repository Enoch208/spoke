"use client";

import { Route01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { ProductPage, QueryState } from "@/components/product/page";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { explorerCopy as copy } from "@/components/graph/copy";
import { Explorer } from "@/components/graph/explorer";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { useMyLinks } from "../shared/campaigns";
import { useQueryState } from "../shared/query";

function BranchSummary({
  nodeId,
  scope,
  campaignId,
}: {
  nodeId: string;
  scope: string | null;
  campaignId: string;
}) {
  const open = useUiStore((state) => state.open);
  const stats = useClientQuery("links.stats", { nodeId });
  const campaign = useClientQuery(
    "campaigns.stats",
    { campaignId },
    { enabled: scope === "campaign" },
  );
  if (scope === "campaign" && campaign.data)
    return (
      <p className="text-body text-sm">
        {fill(copy.summaryCampaign, {
          links: formatCount(campaign.data.links),
          sales: formatCount(
            campaign.data.sales.pending +
              campaign.data.sales.finalized +
              campaign.data.sales.refunded,
          ),
          settled: formatCount(campaign.data.sales.finalized),
          pending: formatCount(campaign.data.sales.pending),
          refunded: formatCount(campaign.data.sales.refunded),
        })}
      </p>
    );
  if (!stats.data) return null;
  const sales = stats.data.sales;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-body text-sm">
        {fill(copy.summary, {
          links: formatCount(stats.data.descendants),
          levels: formatCount(stats.data.maxDepthBelow),
          sales: formatCount(sales.pending + sales.finalized + sales.refunded),
          settled: formatCount(sales.finalized),
          pending: formatCount(sales.pending),
          refunded: formatCount(sales.refunded),
        })}
      </p>
      {stats.data.descendants === 0 ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-subtle text-sm">{copy.onlyMe}</span>
          <Button size="sm" onClick={() => open("M-13", { nodeId })}>
            {copy.share}
          </Button>
        </span>
      ) : null}
    </div>
  );
}

export function NetworkPage() {
  const links = useMyLinks();
  const query = useQueryState();
  const items = links.items;
  const earned = (link: (typeof items)[number]) =>
    Object.values(link.earned).reduce((sum, value) => sum + BigInt(value), 0n);
  const busiest = [...items].sort((a, b) =>
    earned(b) > earned(a) ? 1 : earned(b) < earned(a) ? -1 : 0,
  )[0];
  const chosen =
    items.find((link) => link.campaign.campaignId === query.get("campaign")) ?? busiest;
  return (
    <ProductPage title={copy.title} description={copy.description}>
      <QueryState
        pending={links.query.isPending}
        error={links.query.error}
        retry={() => void links.query.refetch()}
      >
        {!chosen ? (
          <EmptyState
            variant="page"
            icon={Route01Icon}
            title={copy.empty}
            actions={
              <Button asChild>
                <Link href={routes.earn.opportunities}>{copy.emptyAction}</Link>
              </Button>
            }
          />
        ) : (
          <Explorer
            key={chosen.campaign.campaignId}
            earn
            campaignId={chosen.campaign.campaignId}
            campaignName={chosen.campaign.product.title}
            merchant={chosen.campaign.merchant.name}
            myNodeId={chosen.nodeId}
            myLevel={chosen.levelFromMerchant}
            selfNodes={new Set(items.map((link) => link.nodeId))}
            visited={
              new Set(items.filter((link) => link.visitsEstimate > 0).map((link) => link.nodeId))
            }
            campaignSelect={
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-64 max-w-full">
                  <Select
                    value={chosen.campaign.campaignId}
                    onValueChange={(campaign) => {
                      query.set({ campaign, node: null, sale: null });
                    }}
                    options={items.map((link) => ({
                      value: link.campaign.campaignId,
                      label: link.campaign.product.title,
                    }))}
                  />
                </span>
                <CampaignStateChip campaign={chosen.campaign} />
              </span>
            }
            summary={
              <BranchSummary
                nodeId={chosen.nodeId}
                scope={query.get("scope")}
                campaignId={chosen.campaign.campaignId}
              />
            }
          />
        )}
      </QueryState>
    </ProductPage>
  );
}
