"use client";

import type { ModalComponentProps } from "@/components/app/modal-types";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useUiStore } from "@/lib/stores/ui";
import { recoveryCopy } from "./copy/recovery";
import { BackupBody } from "./recovery/backup-body";
import { BackupFooter, backupSubtitle, backupTitle } from "./recovery/backup-footer";
import { useBackup } from "./recovery/use-backup";

const dayMs = 24 * 60 * 60 * 1000;

export default function RecoveryModal({ props, close, isTop }: ModalComponentProps<"M-04">) {
  const backup = useBackup({
    mode: props.mode,
    credentialId: props.credentialId,
  });
  const dismiss = () => {
    backup.wipe();
    close();
  };
  if (backup.me?.accountKind === "wallet")
    return (
      <Dialog
        open
        inert={!isTop}
        size="md"
        title={recoveryCopy.why.title}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        footer={<Button onClick={close}>{recoveryCopy.close}</Button>}
      >
        <Callout tone="info">{recoveryCopy.wallet}</Callout>
      </Dialog>
    );
  return (
    <>
      <Dialog
        open
        inert={!isTop}
        size="md"
        title={backupTitle(backup, props.mode, false)}
        subtitle={backupSubtitle(backup, props.mode)}
        dismissible={!backup.busy}
        onOpenChange={(open) => {
          if (!open) dismiss();
        }}
        footer={
          <BackupFooter
            backup={backup}
            mode={props.mode}
            onboarding={false}
            onLater={() => {
              useUiStore.getState().dismissBanner("B-06", { forMs: dayMs });
              dismiss();
            }}
            onSkip={dismiss}
            onClose={dismiss}
            onContinue={dismiss}
          />
        }
      >
        <div className="flex flex-col gap-4">
          <BackupBody backup={backup} mode={props.mode} onboarding={false} />
        </div>
      </Dialog>
      {backup.prompt}
    </>
  );
}
