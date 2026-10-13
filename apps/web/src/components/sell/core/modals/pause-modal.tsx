"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { fill } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";
import { useChainAction } from "@/lib/tx/use-action";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { pauseCopy as copy } from "../copy/dialogs";
import { Callout } from "../shared/callout";
import { useCampaignMoney } from "../shared/hooks";
import { DialogBadge, DialogSkeleton, FeeNote } from "./parts";

export default function PauseModal({ props, isTop, close }: ModalComponentProps<"M-25">) {
  const money = useCampaignMoney(props.campaignId);
  const start = useChainAction();
  const primary = useRef<HTMLButtonElement>(null);
  const { stateKey } = money;
  const name = money.name ?? "";
  const ended = stateKey === "ended" || stateKey === "expired";
  const paused = stateKey === "paused";
  const effective = ended ? props.mode : paused ? "resume" : "pause";
  const switched = !ended && effective !== props.mode;
  const pausing = effective === "pause";
  const run = () => {
    if (!money.name) return;
    close();
    start(pausing ? "pause" : "resume", {
      campaignId: props.campaignId,
      campaignName: money.name,
    });
  };
  return (
    <Dialog
      open
      size="sm"
      inert={!isTop}
      initialFocus={primary}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={fill(pausing ? copy.pauseTitle : copy.resumeTitle, { campaign: name })}
      badge={<DialogBadge />}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          {!ended && !money.pending ? (
            <Button ref={primary} onClick={run}>
              {pausing ? copy.pausePrimary : copy.resumePrimary}
            </Button>
          ) : null}
        </>
      }
    >
      {money.pending ? (
        <DialogSkeleton />
      ) : ended ? (
        <Callout tone="caution">{copy.ended}</Callout>
      ) : (
        <div className="space-y-4">
          {switched ? (
            <Callout tone="info">{pausing ? copy.alreadyLive : copy.alreadyPaused}</Callout>
          ) : null}
          <p className="text-body">{pausing ? copy.pauseBody : copy.resumeBody}</p>
          {pausing ? <p className="text-subtle text-sm">{copy.pauseNotice}</p> : null}
          {!pausing &&
          money.buckets &&
          money.reward !== null &&
          money.buckets.available < money.reward ? (
            <Callout
              tone="caution"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    useUiStore.getState().open("M-23", { campaignId: props.campaignId });
                  }}
                >
                  {copy.addBudget}
                </Button>
              }
            >
              {copy.resumeExhausted}
            </Callout>
          ) : null}
          <FeeNote />
        </div>
      )}
    </Dialog>
  );
}
