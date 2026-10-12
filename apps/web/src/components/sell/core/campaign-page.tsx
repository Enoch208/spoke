"use client";

import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { formatDateTime, formatHoldPhrase } from "@/lib/format";
import { ProductPage, QueryState, PageLink, Stat } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount, formatBps, formatSplit } from "@/lib/format";
import { VaultPage } from "./vault-page";

export function MerchantCampaignPage({ campaignId }: { campaignId: string }) {
  const campaign = useClientQuery("campaigns.get", { campaignId });
  const policy = useClientQuery("campaigns.policy", { campaignId });
  const data = campaign.data;
  return (
    <ProductPage
      title={data?.product.title ?? "Campaign"}
      description="Manage the reward budget, inspect settled sales and publish future terms."
      actions={
        <div className="flex flex-wrap gap-2">
          <PageLink href={`/c/${campaignId}`}>Public campaign</PageLink>
          <PageLink href={`/c/${campaignId}/network`}>Network</PageLink>
        </div>
      }
    >
      <QueryState
        pending={campaign.isPending}
        error={campaign.error}
        retry={() => void campaign.refetch()}
      >
        {data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Campaign" value={<CampaignStateChip campaign={data} size="md" />} />
              <Stat label="Settled sales" value={data.counts.finalized} />
              <Stat label="Links" value={data.nodeCount} />
            </div>
            <Card>
              <h2 className="font-display text-h4">
                Current terms · Version {data.policy.version}
              </h2>
              <p className="text-body mt-3">
                {formatBps(data.policy.commissionBps)} commission · Up to{" "}
                {data.policy.maxRewardedAncestors} levels · {formatSplit(data.policy.weightsBps)}{" "}
                nearest first · {formatHoldPhrase(data.policy.holdSeconds)}
              </p>
              <p className="text-body mt-3">
                Per-sale cap: {formatAmount(BigInt(data.policy.perSaleCap), data.token)} · Liability
                cap: {formatAmount(BigInt(data.policy.campaignLiabilityCap), data.token)}
              </p>
              <div className="mt-4">
                <CopyField
                  value={data.policy.policyHash}
                  label="Copy policy hash"
                  copiedMessage="Policy hash copied"
                />
              </div>
              {policy.data?.scheduled ? (
                <p className="bg-amber-soft mt-4 rounded-xl p-3">
                  New terms are already scheduled for{" "}
                  {formatDateTime(new Date(policy.data.scheduled.effectiveAt))}. Sales before then
                  keep today’s terms.
                </p>
              ) : (
                <div className="mt-4">
                  <PageLink href={`/sell/campaigns/new?mode=newVersion&campaign=${campaignId}`}>
                    Change terms for future sales
                  </PageLink>
                </div>
              )}
              <p className="text-subtle mt-4 text-sm">
                Terms for a sale never change after it happens. New terms require at least 24 hours’
                notice.
              </p>
            </Card>
            <VaultPage campaignId={campaignId} />
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
