"use client";

import { Download04Icon } from "@hugeicons/core-free-icons";
import { ProductPage } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui";
import { salesCopy as copy } from "../copy/sales";
import { hasModal } from "../shared/has-modal";
import { ProceedsStrip } from "./proceeds-strip";
import { SalesTable } from "./sales-table";

export function SalesPage() {
  return (
    <ProductPage
      title={copy.title}
      description={copy.description}
      actions={
        hasModal("M-35") ? (
          <Button
            variant="secondary"
            icon={Download04Icon}
            onClick={() => {
              useUiStore.getState().open("M-35", { scope: "merchant", kind: "sales" });
            }}
          >
            {copy.export}
          </Button>
        ) : null
      }
    >
      <ProceedsStrip />
      <SalesTable />
    </ProductPage>
  );
}
