"use client";

import { Folder01Icon, LockKeyIcon, Search01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProductPage } from "@/components/product/page";
import { SaleStateChip } from "@/components/product/state-chips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { accessCopy } from "../copy/access";
import { purchaseCopy } from "../copy/purchase";
import { FileRow } from "./file-row";

const report = (saleId: string) => {
  useUiStore.getState().open("M-41", { context: { saleId } });
};

function Notice({
  icon,
  title,
  body,
  actions,
}: {
  icon: typeof LockKeyIcon;
  title: string;
  body?: string;
  actions: ReactNode;
}) {
  return (
    <Card padding="none">
      <EmptyState icon={icon} title={title} body={body} actions={actions} />
    </Card>
  );
}

export function AccessPage({ saleId }: { saleId: string }) {
  const now = useNow();
  const { mode } = useClientContext();
  const demo = mode === "demo";
  const access = useClientQuery("fulfillment.access", { saleId }, { staleTime: 0 });
  const receipt = useClientQuery("receipts.get", { saleId, chainId: activeChain.id });
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: receipt.data?.campaignId ?? "0" },
    { enabled: Boolean(receipt.data) },
  );
  const product = campaign.data?.product;
  const merchant = campaign.data?.merchant;
  const error = access.error;
  const lagging = error?.code === "INDEXER_LAGGING";
  useClientQuery(
    "fulfillment.access",
    { saleId },
    { enabled: lagging, refetchInterval: lagging ? 5_000 : false, staleTime: 0 },
  );
  const crumbs = [
    { label: purchaseCopy.detail.crumb, href: routes.purchases },
    { label: product?.title ?? `#${saleId}`, href: routeTo.purchase(saleId) },
  ];
  const expiresAt = access.data?.items[0]?.expiresAt;
  const body = (() => {
    if (access.isPending)
      return (
        <Card padding="none">
          <SkeletonRows rows={3} />
        </Card>
      );
    if (error?.code === "SALE_REFUNDED") {
      const at = receipt.data?.refundTx?.at ?? receipt.data?.unlockAt;
      return (
        <Notice
          icon={LockKeyIcon}
          title={accessCopy.revokedTitle}
          body={fill(accessCopy.revoked, { time: at ? formatDateTime(new Date(at)) : "" })}
          actions={
            <Button asChild variant="secondary">
              <Link href={routeTo.purchase(saleId)}>{accessCopy.viewPurchase}</Link>
            </Button>
          }
        />
      );
    }
    if (error?.code === "NOT_AUTHORIZED")
      return (
        <Notice
          icon={LockKeyIcon}
          title={accessCopy.unauthorised}
          actions={
            <Button onClick={() => useUiStore.getState().open("M-10", {})}>
              {accessCopy.switchAccount}
            </Button>
          }
        />
      );
    if (error?.code === "NOT_FOUND")
      return (
        <Notice
          icon={Search01Icon}
          title={accessCopy.notFound}
          actions={
            <Button asChild variant="secondary">
              <Link href={routes.purchases}>{purchaseCopy.detail.backToPurchases}</Link>
            </Button>
          }
        />
      );
    if (lagging)
      return (
        <Card>
          <p role="status" className="text-ink">
            {accessCopy.syncing}
          </p>
        </Card>
      );
    if (error)
      return (
        <Notice
          icon={Folder01Icon}
          title={accessCopy.error}
          actions={
            <Button variant="secondary" onClick={() => void access.refetch()}>
              {accessCopy.tryAgain}
            </Button>
          }
        />
      );
    const items = access.data.items;
    if (items.length === 0 || !product)
      return (
        <Notice
          icon={Folder01Icon}
          title={accessCopy.empty}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  report(saleId);
                }}
              >
                {accessCopy.report}
              </Button>
              {merchant ? (
                <Button asChild variant="ghost">
                  <Link href={routeTo.merchant(merchant.slug)}>{accessCopy.merchantProfile}</Link>
                </Button>
              ) : null}
            </>
          }
        />
      );
    return (
      <Card className="flex flex-col gap-4">
        <ul aria-label={accessCopy.listLabel} className="divide-hairline divide-y">
          {items.map((item, index) => (
            <FileRow
              key={item.id}
              item={item}
              index={index}
              mode={product.fulfillmentMode}
              product={product.title}
              demo={demo}
              refresh={async () => (await access.refetch()).data?.items[index] ?? null}
            />
          ))}
        </ul>
        {expiresAt && !demo ? (
          <p className="text-subtle text-sm">
            {fill(accessCopy.expires, { relative: formatRelative(new Date(expiresAt)) })}
          </p>
        ) : null}
      </Card>
    );
  })();
  const open = !error && receipt.data;
  return (
    <ProductPage
      title={accessCopy.title}
      description={
        product && merchant
          ? fill(accessCopy.subline, { product: product.title, merchant: merchant.name })
          : undefined
      }
      breadcrumbs={crumbs}
      actions={
        receipt.data ? (
          <SaleStateChip status={receipt.data.state} unlockAt={receipt.data.unlockAt} size="md" />
        ) : undefined
      }
    >
      {open ? (
        <p className="bg-lime-soft text-olive rounded-xl p-3 text-sm">
          {receipt.data.state === "FINALIZED" || now >= Date.parse(receipt.data.unlockAt)
            ? accessCopy.openFinal
            : accessCopy.openPending}
        </p>
      ) : null}
      {open && product?.description ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-ink font-medium">{accessCopy.instructions}</h2>
          <p className="text-body text-sm whitespace-pre-line">{product.description}</p>
        </Card>
      ) : null}
      {body}
      <p className="text-subtle text-sm">
        {accessCopy.problem}{" "}
        <button
          type="button"
          className="text-ink underline underline-offset-2"
          onClick={() => {
            report(saleId);
          }}
        >
          {accessCopy.report}
        </button>
      </p>
    </ProductPage>
  );
}
