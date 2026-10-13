"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useChainAction } from "@/lib/tx/use-action";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { endCopy as copy } from "../copy/dialogs";
import { Callout } from "../shared/callout";
import { useCampaignMoney } from "../shared/hooks";
import { DialogBadge, DialogSkeleton, FeeNote } from "./parts";

export default function EndModal({ props, isTop, close }: ModalComponentProps<"M-26">) {
  const money = useCampaignMoney(props.campaignId);
  const start = useChainAction();
  const keep = useRef<HTMLButtonElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [tried, setTried] = useState(false);
  const { stateKey, buckets } = money;
  const token = money.campaign.data?.token;
  const ended = stateKey === "ended" || stateKey === "expired";
  const end = () => {
    setTried(true);
    if (!confirmed || !money.name) return;
    close();
    start("end", { campaignId: props.campaignId, campaignName: money.name });
  };
  return (
    <Dialog
      open
      size="sm"
      role="alertdialog"
      inert={!isTop}
      initialFocus={keep}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={fill(copy.title, { campaign: money.name ?? "" })}
      badge={<DialogBadge />}
      footer={
        <>
          <Button ref={keep} variant="secondary" onClick={close}>
            {copy.keep}
          </Button>
          {!ended && !money.pending ? (
            <Button variant="danger" onClick={end}>
              {copy.primary}
            </Button>
          ) : null}
        </>
      }
    >
      {money.pending ? (
        <DialogSkeleton />
      ) : ended ? (
        <Callout tone="info">{copy.already}</Callout>
      ) : (
        <div className="space-y-4">
          <p className="text-body">{copy.body}</p>
          {buckets && token ? (
            <p className="text-body">
              {fill(copy.withdraw, { available: formatAmount(buckets.available, token) })}
            </p>
          ) : null}
          <Checkbox checked={confirmed} onCheckedChange={setConfirmed} label={copy.confirm} />
          {tried && !confirmed ? (
            <p role="alert" className="text-pink-ink text-sm">
              {copy.confirmError}
            </p>
          ) : null}
          <FeeNote />
        </div>
      )}
    </Dialog>
  );
}
