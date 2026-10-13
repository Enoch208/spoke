"use client";

import type { ModalComponentProps } from "@/components/app/modal-types";
import { Drawer } from "@/components/ui/drawer";
import { ModeBadge } from "@/components/ui/mode-badge";
import { SalePanel } from "@/components/graph/sale-panel";
import { salePanelCopy } from "@/components/graph/copy";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";

export default function SalePathDialog({ props, isTop, close }: ModalComponentProps<"M-16">) {
  const { mode } = useClientContext();
  return (
    <Drawer
      wide
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      inert={!isTop}
      title={fill(salePanelCopy.title, { saleId: props.saleId })}
      badge={<ModeBadge mode={mode} />}
    >
      <SalePanel saleId={props.saleId} heading={false} showInNetwork onNavigate={close} />
    </Drawer>
  );
}
