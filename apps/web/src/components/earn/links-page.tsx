"use client";

import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import Link from "next/link";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount } from "@/lib/format";

export function LinksPage({ nodeId }: { nodeId?: string }) {
  const list = useClientQuery("links.mine", {}, { enabled: !nodeId });
  const link = useClientQuery("links.get", { nodeId: nodeId ?? "0" }, { enabled: Boolean(nodeId) });
  const rows = nodeId ? (link.data ? [link.data] : []) : (list.data?.items ?? []);
  return (
    <ProductPage
      title={nodeId ? "Your sharing link" : "Your links"}
      description="Your link records its parent and can’t be moved to another branch. Tell people you may earn when they buy."
      actions={<PageLink href="/earn/opportunities">Find a campaign</PageLink>}
    >
      <QueryState
        pending={nodeId ? link.isPending : list.isPending}
        error={nodeId ? link.error : list.error}
        retry={() => void (nodeId ? link.refetch() : list.refetch())}
      >
        <div className="grid grid-cols-1 gap-4">
          {rows.map((row) => (
            <Card key={row.nodeId} className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-h4">
                    <Link href={`/earn/links/${row.nodeId}`}>{row.campaign.product.title}</Link>
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CampaignStateChip campaign={row.campaign} />
                    <span className="text-subtle text-sm">
                      {row.campaign.merchant.name} · Level {row.levelFromMerchant}
                    </span>
                  </div>
                </div>
                <PageLink href={`/c/${row.campaign.campaignId}/network`}>View network</PageLink>
              </div>
              <div className="mt-4">
                <CopyField
                  value={row.url}
                  label="Copy sharing link"
                  copiedMessage="Sharing link copied"
                />
              </div>
              <p className="text-body mt-3 text-sm">
                Disclosure: I may earn a reward from the merchant if you buy through this link. Your
                price is the same with or without a referral.
              </p>
              <p className="text-subtle mt-4 text-sm">
                {row.conversions} settled conversions ·{" "}
                {row.earned
                  ? formatAmount(BigInt(row.earned.claimed), row.campaign.token)
                  : "Not shared"}{" "}
                claimed · Link #{row.nodeId}
              </p>
            </Card>
          ))}
          {rows.length === 0 ? (
            <Card>
              <p>No links yet. Find a product you want to recommend and create your first link.</p>
            </Card>
          ) : null}
        </div>
      </QueryState>
    </ProductPage>
  );
}
