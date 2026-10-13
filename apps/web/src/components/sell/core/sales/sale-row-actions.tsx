"use client";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui";
import { salesCopy as copy } from "../copy/sales";
import { useActiveTx } from "../shared/hooks";
import { openFinalize } from "../shared/settle";
import { canFinalizeSale, canRefundSale } from "./sale-chip";
import type { SaleListRow } from "./sales-query";

export function SaleRowAction({
  row,
  now,
  block = false,
}: {
  row: SaleListRow;
  now: number;
  block?: boolean;
}) {
  const refunding = useActiveTx(`refund:${row.saleId}`);
  const finalizing = useActiveTx(`finalize:${row.saleId}`);
  if (refunding || finalizing)
    return (
      <Button size="sm" variant="secondary" loading loadingLabel={copy.waiting} block={block}>
        {copy.waiting}
      </Button>
    );
  if (canRefundSale(row.state, row.unlockAt, now))
    return (
      <Button
        size="sm"
        variant="secondary"
        block={block}
        onClick={(event) => {
          event.stopPropagation();
          useUiStore.getState().open("M-22", { saleId: row.saleId });
        }}
      >
        {copy.refund}
      </Button>
    );
  if (canFinalizeSale(row.state, row.unlockAt, now))
    return (
      <Button
        size="sm"
        block={block}
        onClick={(event) => {
          event.stopPropagation();
          openFinalize([row.saleId]);
        }}
      >
        {copy.finalize}
      </Button>
    );
  return null;
}
