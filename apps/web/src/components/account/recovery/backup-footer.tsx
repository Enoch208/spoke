"use client";

import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { recoveryCopy } from "../copy/recovery";
import type { Backup, BackupMode } from "./use-backup";

export const backupTitle = (backup: Backup, mode: BackupMode, onboarding: boolean) => {
  if (backup.step === "why")
    return onboarding
      ? recoveryCopy.onboarding.title
      : mode === "reveal"
        ? recoveryCopy.why.revealTitle
        : recoveryCopy.why.title;
  if (backup.step === "write") return recoveryCopy.write.title;
  if (backup.step === "check") return recoveryCopy.check.title;
  if (backup.step === "skip") return recoveryCopy.onboarding.skipTitle;
  return recoveryCopy.done.chip;
};

export const backupSubtitle = (backup: Backup, mode: BackupMode) => {
  if (mode !== "backup") return undefined;
  const index = ["why", "write", "check"].indexOf(backup.step);
  return index === -1 ? undefined : fill(recoveryCopy.stepOf, { n: String(index + 1) });
};

export function BackupFooter({
  backup,
  mode,
  onboarding,
  onLater,
  onSkip,
  onClose,
  onContinue,
}: {
  backup: Backup;
  mode: BackupMode;
  onboarding: boolean;
  onLater: () => void;
  onSkip: () => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  if (backup.step === "why")
    return (
      <>
        <Button
          variant="secondary"
          size={onboarding ? "lg" : "md"}
          onClick={() => {
            if (onboarding) backup.setStep("skip");
            else onLater();
          }}
        >
          {onboarding ? recoveryCopy.why.skip : recoveryCopy.why.later}
        </Button>
        <Button
          size={onboarding ? "lg" : "md"}
          loading={backup.busy}
          loadingLabel={recoveryCopy.check.unlocking}
          onClick={() => void backup.showPhrase()}
        >
          {backup.failure
            ? recoveryCopy.tryAgain
            : onboarding
              ? recoveryCopy.onboarding.show
              : recoveryCopy.why.show}
        </Button>
      </>
    );
  if (backup.step === "write")
    return (
      <>
        <Button
          variant="secondary"
          size={onboarding ? "lg" : "md"}
          icon={backup.revealed ? ViewOffIcon : ViewIcon}
          onClick={() => {
            backup.setRevealed(!backup.revealed);
          }}
        >
          {backup.revealed ? recoveryCopy.write.hide : recoveryCopy.write.reveal}
        </Button>
        <Button
          size={onboarding ? "lg" : "md"}
          disabled={!backup.seen}
          onClick={() => {
            if (mode === "reveal") {
              backup.wipe();
              onClose();
              return;
            }
            backup.setRevealed(false);
            backup.setStep("check");
          }}
        >
          {mode === "reveal" ? recoveryCopy.write.done : recoveryCopy.write.written}
        </Button>
      </>
    );
  if (backup.step === "check")
    return (
      <Button
        size={onboarding ? "lg" : "md"}
        loading={backup.busy}
        onClick={() => void backup.confirm()}
      >
        {backup.failure?.kind === "record" ? recoveryCopy.tryAgain : recoveryCopy.check.confirm}
      </Button>
    );
  if (backup.step === "skip")
    return (
      <>
        <Button variant="secondary" size="lg" onClick={onSkip}>
          {recoveryCopy.onboarding.skipAnyway}
        </Button>
        <Button
          size="lg"
          onClick={() => {
            backup.setStep("why");
          }}
        >
          {recoveryCopy.onboarding.backUpNow}
        </Button>
      </>
    );
  return (
    <Button size={onboarding ? "lg" : "md"} onClick={onContinue}>
      {recoveryCopy.done.continue}
    </Button>
  );
}
