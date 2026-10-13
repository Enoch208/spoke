"use client";

import Link from "next/link";
import { ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { saleDetailCopy as copy } from "../copy/sales";
import { useIsDemo, useOwnsCampaign } from "../shared/hooks";
import { versionOf } from "../shared/policy";
import { RefundRequest } from "./refund-request";
import { SaleAllocations } from "./sale-allocations";
import { canRefundSale, merchantSaleKey, MerchantSaleChip } from "./sale-chip";
import { SaleProof } from "./sale-proof";
import { SaleActions, SaleSummary } from "./sale-side";
import { SaleTimeline } from "./sale-timeline";

export function SaleDetailPage({ saleId }: { saleId: string }) {
  const now = useNow();
  const demo = useIsDemo();
  const receipt = useClientQuery(
    "receipts.get",
    { saleId, chainId: activeChain.id },
    { refetchInterval: 10_000 },
  );
  const data = receipt.data;
  const campaignId = data?.campaignId ?? "0";
  const campaign = useClientQuery("campaigns.get", { campaignId }, { enabled: Boolean(data) });
  const policy = useClientQuery("campaigns.policy", { campaignId }, { enabled: Boolean(data) });
  const path = useClientQuery("graph.salePath", { saleId, chainId: activeChain.id });
  const requests = useClientQuery("disputes.list", { kind: "refund_request", status: "open" });
  const owns = useOwnsCampaign(campaign.data?.merchant.slug);
  const request = requests.data?.items.find((item) => item.saleId === saleId);
  const publicReceipt = receiptHref(saleId, activeChain.id);
  const title = fill(copy.title, { id: saleId });
  return (
    <ProductPage
      title={title}
      breadcrumbs={[{ label: copy.breadcrumb, href: "/sell/sales" }]}
      actions={
        <Button asChild variant="secondary">
          <Link href={publicReceipt}>{copy.publicReceipt}</Link>
        </Button>
      }
    >
      <QueryState
        pending={receipt.isPending || (Boolean(data) && (campaign.isPending || owns === null))}
        error={receipt.error?.code === "NOT_FOUND" ? null : receipt.error}
        retry={() => void receipt.refetch()}
      >
        {!data ? (
          <Card>
            <EmptyState
              title={fill(copy.notFound, { id: saleId })}
              actions={
                <Button asChild variant="secondary">
                  <Link href="/sell/sales">{copy.back}</Link>
                </Button>
              }
            />
          </Card>
        ) : !owns ? (
          <Card>
            <EmptyState
              title={copy.notYours}
              actions={
                <Button asChild variant="secondary">
                  <Link href={publicReceipt}>{copy.publicReceipt}</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-6">
            <Card padding="sm" className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5">
              <MerchantSaleChip
                size="md"
                stateKey={merchantSaleKey(data.state, data.unlockAt, data.proceedsState, now)}
                unlockAt={data.unlockAt}
                now={now}
              />
              <span className="text-ink font-mono tabular-nums">
                {formatAmount(BigInt(data.price), data.token, { testnet: true })}
              </span>
              <span className="text-subtle text-sm">
                {copy.campaign}{" "}
                <Link
                  href={`/sell/campaigns/${data.campaignId}`}
                  className="text-ink font-medium hover:underline"
                >
                  {campaign.data?.product.title ?? `#${data.campaignId}`}
                </Link>
              </span>
            </Card>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                {request && data.state === "PENDING" ? (
                  <RefundRequest
                    dispute={request}
                    canRefund={canRefundSale(data.state, data.unlockAt, now)}
                  />
                ) : null}
                <SaleTimeline receipt={data} now={now} demo={demo} />
                <SaleAllocations
                  receipt={data}
                  path={path.data?.nodes}
                  version={policy.data ? versionOf(policy.data, data.policyVersion) : undefined}
                />
                <SaleProof receipt={data} demo={demo} />
              </div>
              <div className="min-w-0 space-y-6 max-lg:order-first lg:sticky lg:top-24 lg:self-start">
                <SaleActions receipt={data} now={now} />
                <SaleSummary receipt={data} demo={demo} />
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </ProductPage>
  );
}
