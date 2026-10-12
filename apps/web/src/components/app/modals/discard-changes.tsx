"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { discardDialog, fill, toasts } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";
import type { ModalComponentProps } from "../modal-types";

export default function DiscardChanges({ props, isTop, close }: ModalComponentProps<"M-43">) {
  const keepEditing = useRef<HTMLButtonElement>(null);
  const pushToast = useUiStore((state) => state.pushToast);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const discard = () => {
    close();
    props.onContinue();
  };

  const saveDraft = async () => {
    if (!props.onSaveDraft) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await props.onSaveDraft();
    } catch {
      setSaving(false);
      setSaveFailed(true);
      return;
    }
    pushToast({
      id: "T-03",
      tone: "success",
      message: toasts["T-03"].copy,
      durationMs: toasts["T-03"].duration,
    });
    discard();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      size="sm"
      role="alertdialog"
      inert={!isTop}
      initialFocus={keepEditing}
      title={discardDialog.title}
      subtitle={fill(discardDialog.body, { subject: props.subject })}
      footer={
        <>
          <Button variant="danger" onClick={discard} disabled={saving}>
            {discardDialog.actions.discard}
          </Button>
          {props.canSaveDraft && props.onSaveDraft ? (
            <Button variant="secondary" loading={saving} onClick={() => void saveDraft()}>
              {discardDialog.actions.saveDraft}
            </Button>
          ) : null}
          <Button ref={keepEditing} onClick={close}>
            {discardDialog.actions.keepEditing}
          </Button>
        </>
      }
    >
      {saveFailed ? <ErrorState variant="inline" title={discardDialog.states.saveFailed} /> : null}
    </Dialog>
  );
}
