"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";
import { explorerTxUrl } from "@spoke/protocol";
import Link from "next/link";
import { ProductPage } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { routeTo, routes } from "@/lib/routes";
import { useTxStore } from "@/lib/stores/tx";
import type { TxRecord } from "@/lib/tx/types";
import { activeChain } from "@/lib/wagmi";
import { viewRecord } from "../checkout/model";
import { doneCopy } from "../copy/done";
import { purchaseCopy } from "../copy/purchase";

type PurchaseRecord = TxRecord<"purchase">;

export function useConfirmedPurchase(saleId: string): PurchaseRecord | null {
  return useTxStore(
    (state) =>
      state.records.find(
        (record): record is PurchaseRecord =>
          record.kind === "purchase" &&
          record.context.saleId === saleId &&
          viewRecord(record).kind === "done",
      ) ?? null,
  );
}

export function SyncingPurchase({
  saleId,
  record,
  demo,
}: {
  saleId: string;
  record: PurchaseRecord;
  demo: boolean;
}) {
  const hash = record.steps.find((step) => step.kind === "purchase")?.hash ?? null;
  const url = hash && !demo ? explorerTxUrl(activeChain.id, hash) : null;
  return (
    <ProductPage
      title={record.params.productTitle}
      description={record.params.merchantName}
      breadcrumbs={[{ label: purchaseCopy.detail.crumb, href: routes.purchases }]}
      actions={<StatusChip label={doneCopy.syncingChip} icon={RefreshIcon} tone="sky" size="md" />}
    >
      <Card className="flex flex-col gap-3">
        <p role="status" className="text-ink">
          {purchaseCopy.detail.syncingBody}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href={routeTo.purchaseAccess(saleId)}>{purchaseCopy.detail.openFiles}</Link>
          </Button>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-ink text-sm font-medium underline underline-offset-2"
            >
              {doneCopy.viewTransaction}
            </a>
          ) : null}
        </div>
      </Card>
    </ProductPage>
  );
}
