"use client";

import { protocolLimits } from "@spoke/protocol";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { FinalizeBatch } from "./finalize-batch";
import { FinalizeSingle } from "./finalize-single";

export default function FinalizeDialog({ props, isTop, close }: ModalComponentProps<"M-20">) {
  const saleIds = props.saleIds.slice(0, protocolLimits.maxBatchFinalize);
  const [only] = saleIds;
  if (saleIds.length === 1 && only !== undefined)
    return <FinalizeSingle saleId={only} isTop={isTop} close={close} />;
  return <FinalizeBatch saleIds={saleIds} isTop={isTop} close={close} />;
}
