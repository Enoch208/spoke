"use client";

import { Dialog } from "@/components/ui/dialog";
import { FundsPanel } from "@/components/buy/funds-panel";
import type { ModalComponentProps } from "@/components/app/modal-types";

export default function InsufficientFundsModal({ props, close }: ModalComponentProps<"M-06">) {
  return (
    <Dialog
      open
      title="Add test funds"
      subtitle={props.context ?? "MON pays gas and SDUSD pays for products and rewards."}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <FundsPanel />
      <p className="text-subtle mt-4 text-sm">
        Once the balance updates, return to your transaction and try again. A failed balance check
        sends no payment.
      </p>
    </Dialog>
  );
}
