"use client";

import { usePathname } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui";
import type { ModalComponentProps } from "@/components/app/modal-types";

export default function SessionExpiredModal({ props, close }: ModalComponentProps<"M-08">) {
  const path = usePathname();
  return (
    <Dialog
      open
      title="Sign in again to continue"
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={
        <Button
          onClick={() => {
            close();
            useUiStore.getState().open("M-01", {
              reason: "open",
              returnTo: path,
              expectedAddress: props.expectedAddress,
            });
          }}
        >
          Confirm your account
        </Button>
      }
    >
      <p>
        Your session ended. Confirm the same account to resume. Transactions already sent continue
        onchain.
      </p>
    </Dialog>
  );
}
