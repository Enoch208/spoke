"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { fill } from "@/lib/copy";
import { directDialogCopy } from "../copy/blocked";

export type DirectReason = keyof typeof directDialogCopy.reasons;

export function DirectDialog({
  open,
  onOpenChange,
  referrer,
  price,
  reason,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrer: string;
  price: string;
  reason: DirectReason | null;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={directDialogCopy.title}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {directDialogCopy.keep}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {directDialogCopy.confirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {reason ? <p className="text-ink font-medium">{directDialogCopy.reasons[reason]}</p> : null}
        <p className="text-body">
          {reason === "invalidReferral" || reason === "otherCampaign"
            ? fill(directDialogCopy.priceStays, { price })
            : fill(directDialogCopy.body, { referrer, price })}
        </p>
      </div>
    </Dialog>
  );
}
