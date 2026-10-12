"use client";

import Link from "next/link";
import { zeroHash } from "viem";
import { ProductPage, QueryState, Stat, PageLink } from "@/components/product/page";
import { Card, Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientQuery } from "@/lib/query/use-client";
import {
  formatAmount,
  formatBps,
  formatDateTime,
  formatHoldPhrase,
  formatSplit,
} from "@/lib/format";
import { CampaignArt } from "@/components/product/campaign-art";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { campaignStateKey, publicExplainer } from "@/lib/domain/campaign-state";
import { useChainAction } from "@/lib/tx/use-action";
import { useSessionStore } from "@/lib/stores/session";
import { useClientContext } from "@/lib/client/provider";
import { fill, joinEligibilityLines } from "@/lib/copy";

export function CampaignPage({
  campaignId,
  parentNodeId = "0",
  code,
}: {
  campaignId: string;
  parentNodeId?: string;
  code?: string;
}) {
  const campaign = useClientQuery("campaigns.get", { campaignId });
  const join = useClientQuery("links.previewJoin", { campaignId, parent: parentNodeId });
  const address = useSessionStore((state) => state.address);
  const { mode } = useClientContext();
  const start = useChainAction();
  const data = campaign.data;
  return (
    <ProductPage
      title={data?.product.title ?? "Campaign"}
      description={data?.product.summary}
      breadcrumbs={[{ label: "Explore", href: "/explore" }]}
      actions={data ? <CampaignStateChip campaign={data} size="md" /> : undefined}
    >
      <QueryState
        pending={campaign.isPending}
        error={campaign.error}
        retry={() => void campaign.refetch()}
      >
        {data ? (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-5">
                <CampaignArt
                  seed={data.campaignId}
                  imageUrl={data.product.media.find((asset) => asset.kind === "image")?.url}
                  title={data.product.title}
                  className="border-hairline h-64 rounded-3xl border"
                />
                <p className="text-body whitespace-pre-wrap">{data.product.description}</p>
                <p className="text-sm">
                  By{" "}
                  <Link className="underline" href={`/m/${data.merchant.slug}`}>
                    {data.merchant.name}
                  </Link>{" "}
                  · {data.product.category}
                </p>
                <Card>
                  <h2 className="font-display text-h4">Settlement and refunds</h2>
                  <p className="text-body mt-3">
                    Every sale has {formatHoldPhrase(data.policy.holdSeconds)}. Until it ends, the
                    merchant can refund you in full. After that the sale is final and can’t be
                    refunded through Spoke.
                  </p>
                  <p className="text-body mt-3">{data.product.refundPolicy}</p>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <p className="text-subtle">You pay</p>
                  <p className="font-mono text-h4 mt-2 break-words">
                    {formatAmount(BigInt(data.price), data.token, { testnet: true })}
                  </p>
                  <p className="text-subtle mt-2 text-sm">
                    Testnet demonstration token. No cash value and no guarantee of redemption.
                  </p>
                  {data.state !== "FUNDED_ACTIVE" ? (
                    <p className="bg-amber-soft mt-4 rounded-xl p-3">
                      {fill(publicExplainer(campaignStateKey(data)), {
                        endsAt: formatDateTime(new Date(data.endsAt)),
                      })}
                    </p>
                  ) : null}
                  {data.state === "FUNDED_ACTIVE" ? (
                    <Button block asChild className="mt-5">
                      <Link
                        href={`/checkout/${campaignId}${code ? `?ref=${encodeURIComponent(code)}` : ""}`}
                      >
                        Buy for {formatAmount(BigInt(data.price), data.token)}
                      </Link>
                    </Button>
                  ) : (
                    <Button block disabled className="mt-5">
                      Purchases closed
                    </Button>
                  )}
                </Card>
                <Card>
                  <h2 className="font-display text-h4">Share and earn</h2>
                  <p className="text-body mt-2">
                    Merchant-funded commission: {formatBps(data.policy.commissionBps)} across up to{" "}
                    {data.policy.maxRewardedAncestors} contributors. Nearest first:{" "}
                    {formatSplit(data.policy.weightsBps)}.
                  </p>
                  <p className="text-subtle mt-3 text-sm">
                    Attribution follows link ancestry. It isn’t a claim about who influenced the
                    buyer.
                  </p>
                  {join.data?.eligibility === "already_joined" && join.data.nodeId ? (
                    <PageLink href={`/earn/links/${join.data.nodeId}`}>View your link</PageLink>
                  ) : (
                    <Button
                      block
                      className="mt-4"
                      disabled={
                        data.state !== "FUNDED_ACTIVE" ||
                        (Boolean(address) && join.data?.eligibility !== "ok")
                      }
                      onClick={() => {
                        start("createNode", {
                          campaignId,
                          campaignName: data.product.title,
                          parentNodeId,
                          metadataHash: zeroHash,
                        });
                      }}
                    >
                      Create my link
                    </Button>
                  )}
                  {join.data &&
                  join.data.eligibility !== "ok" &&
                  join.data.eligibility !== "already_joined" ? (
                    <p className="text-subtle mt-2 text-sm">
                      {joinEligibilityLines[join.data.eligibility]}
                    </p>
                  ) : null}
                </Card>
                <PageLink href={`/c/${campaignId}/network`}>
                  Inspect the distribution graph
                </PageLink>
                {mode === "demo" ? null : (
                  <a
                    className="text-ink block text-sm underline underline-offset-2"
                    href={data.onchainUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View campaign onchain
                  </a>
                )}
              </div>
            </div>
            <Panel title="An inspectable record">
              <div className="grid gap-2 sm:grid-cols-3">
                <Stat label="Settled sales" value={data.counts.finalized} />
                <Stat label="Distribution links" value={data.nodeCount} />
                <Stat
                  label="Available reward budget"
                  value={formatAmount(BigInt(data.rewardLedger.available), data.token)}
                />
              </div>
            </Panel>
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
