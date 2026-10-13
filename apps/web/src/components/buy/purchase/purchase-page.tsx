"use client";

import { Message01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { ProductPage, QueryState } from "@/components/product/page";
import { SaleStateChip } from "@/components/product/state-chips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref, routes } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { useWide } from "../checkout/use-wide";
import { purchaseCopy } from "../copy/purchase";
import { ReceiptCard } from "./receipt-card";
import { FilesCard, HelpCard, PublicReceiptCard, SharePanel } from "./side-cards";
import { StatusPanel } from "./status-panel";
import { SyncingPurchase, useConfirmedPurchase } from "./syncing";
import { TimelineCard } from "./timeline-card";
import { WhoEarned } from "./who-earned";

const copy = purchaseCopy.detail;
const crumbs = [{ label: copy.crumb, href: routes.purchases }];

export function PurchasePage({ saleId }: { saleId: string }) {
  const now = useNow();
  const wide = useWide();
  const { mode } = useClientContext();
  const demo = mode === "demo";
  const address = useSessionStore((state) => state.address);
  const confirmed = useConfirmedPurchase(saleId);
  const receipt = useClientQuery(
    "receipts.get",
    { saleId, chainId: activeChain.id },
    { refetchInterval: confirmed ? 5_000 : 10_000 },
  );
  const data = receipt.data;
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: data?.campaignId ?? "0" },
    { enabled: Boolean(data) },
  );
  const title = campaign.data?.product.title ?? fill(copy.sale, { saleId });
  if (receipt.error?.code === "NOT_FOUND")
    return confirmed ? (
      <SyncingPurchase saleId={saleId} record={confirmed} demo={demo} />
    ) : (
      <ProductPage title={title} breadcrumbs={crumbs}>
        <Card padding="none">
          <EmptyState
            icon={Search01Icon}
            title={copy.notFound}
            actions={
              <Button asChild>
                <Link href={routes.purchases}>{copy.backToPurchases}</Link>
              </Button>
            }
          />
        </Card>
      </ProductPage>
    );
  const otherBuyer =
    data?.buyer && address ? data.buyer.toLowerCase() !== address.toLowerCase() : false;
  const description = campaign.data
    ? `${campaign.data.merchant.name} · ${fill(copy.sale, { saleId })}`
    : fill(copy.sale, { saleId });
  return (
    <ProductPage
      title={title}
      description={description}
      breadcrumbs={crumbs}
      actions={
        data ? (
          <>
            <SaleStateChip status={data.state} unlockAt={data.unlockAt} size="md" />
            {data.refundRequest?.status === "open" ? (
              <StatusChip
                label={purchaseCopy.list.refundRequested}
                icon={Message01Icon}
                tone="amber"
                size="md"
              />
            ) : null}
          </>
        ) : undefined
      }
    >
      <QueryState
        pending={receipt.isPending}
        error={receipt.error}
        retry={() => void receipt.refetch()}
      >
        {data && otherBuyer ? (
          <Card padding="none">
            <EmptyState
              title={copy.otherAccount}
              actions={
                <>
                  <Button
                    onClick={() => {
                      useUiStore.getState().open("M-10", {});
                    }}
                  >
                    {copy.switchAccount}
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={receiptHref(saleId, activeChain.id)}>{copy.viewPublic}</Link>
                  </Button>
                </>
              }
            />
          </Card>
        ) : data ? (
          wide ? (
            <div className="grid grid-cols-12 items-start gap-6">
              <div className="col-span-8 flex min-w-0 flex-col gap-4">
                <StatusPanel receipt={data} now={now} demo={demo} />
                <FilesCard receipt={data} campaign={campaign.data} />
                <WhoEarned receipt={data} collapsible={false} />
                <TimelineCard receipt={data} now={now} demo={demo} />
                <ReceiptCard receipt={data} campaign={campaign.data} demo={demo} />
              </div>
              <div className="col-span-4 flex min-w-0 flex-col gap-4">
                <SharePanel receipt={data} campaign={campaign.data} />
                <PublicReceiptCard receipt={data} />
                <HelpCard receipt={data} now={now} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <StatusPanel receipt={data} now={now} demo={demo} />
              <FilesCard receipt={data} campaign={campaign.data} />
              <WhoEarned receipt={data} collapsible />
              <SharePanel receipt={data} campaign={campaign.data} />
              <ReceiptCard receipt={data} campaign={campaign.data} demo={demo} />
              <TimelineCard receipt={data} now={now} demo={demo} />
              <PublicReceiptCard receipt={data} />
              <HelpCard receipt={data} now={now} />
            </div>
          )
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
