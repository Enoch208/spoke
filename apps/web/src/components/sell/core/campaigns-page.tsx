"use client";

import Link from "next/link";
import { demoToken } from "@spoke/protocol";
import { ProductPage, QueryState, PageLink, Stat } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount } from "@/lib/format";

export function MerchantCampaignsPage({ overview = false }: { overview?: boolean }) {
  const campaigns = useClientQuery("campaigns.mine", {});
  const vault = useClientQuery("vault.get", {}, { enabled: overview });
  const totals = vault.data?.totals[0];
  return (
    <ProductPage
      title={overview ? "Your distribution business" : "Your campaigns"}
      description="Fund rewards separately from buyer payments. Only settled sales count toward your distribution record."
      actions={<PageLink href="/sell/campaigns/new">Create campaign</PageLink>}
    >
      {overview ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Available rewards"
            value={totals ? formatAmount(BigInt(totals.rewards.available), totals.token) : "—"}
          />
          <Stat
            label="Owed to distributors"
            value={
              totals ? formatAmount(BigInt(totals.rewards.vestedUnclaimed), totals.token) : "—"
            }
          />
          <Stat
            label="Proceeds ready to claim"
            value={
              totals ? formatAmount(BigInt(totals.proceeds.proceedsClaimable), totals.token) : "—"
            }
          />
        </div>
      ) : null}
      <QueryState
        pending={campaigns.isPending}
        error={campaigns.error}
        retry={() => void campaigns.refetch()}
      >
        <div className="grid gap-4">
          {campaigns.data?.items.map((campaign) => (
            <Card key={campaign.campaignId ?? campaign.draftId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-h4">
                    <Link
                      href={
                        campaign.campaignId
                          ? `/sell/campaigns/${campaign.campaignId}`
                          : `/sell/campaigns/new?draft=${encodeURIComponent(campaign.draftId ?? "")}`
                      }
                    >
                      {campaign.productTitle}
                    </Link>
                  </h2>
                  <p className="text-subtle mt-2 text-sm">
                    {campaign.state} · {campaign.sales.finalized} settled · {campaign.pendingSales}{" "}
                    pending · {campaign.links} links
                  </p>
                </div>
                <PageLink
                  href={
                    campaign.campaignId
                      ? `/sell/campaigns/${campaign.campaignId}`
                      : `/sell/campaigns/new?draft=${encodeURIComponent(campaign.draftId ?? "")}`
                  }
                >
                  {campaign.campaignId ? "Manage campaign" : "Open draft"}
                </PageLink>
              </div>
              <div className="border-hairline mt-4 flex flex-wrap gap-5 border-t pt-4 text-sm">
                <span>
                  Available rewards:{" "}
                  <span className="font-mono">
                    {formatAmount(BigInt(campaign.availableRewards), demoToken)}
                  </span>
                </span>
                <span>
                  Proceeds ready:{" "}
                  <span className="font-mono">
                    {formatAmount(BigInt(campaign.proceedsClaimable), demoToken)}
                  </span>
                </span>
              </div>
            </Card>
          ))}
          {campaigns.data?.items.length === 0 ? (
            <Card>
              <p>Create a product, choose its commission policy and fund your first campaign.</p>
              <div className="mt-4">
                <PageLink href="/sell/products/new">Add product</PageLink>
              </div>
            </Card>
          ) : null}
        </div>
      </QueryState>
    </ProductPage>
  );
}
