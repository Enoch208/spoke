"use client";

import { Badge } from "@/components/ui/badge";
import { welcomeCopy } from "../copy/welcome";
import { FlowFrame } from "../flow/flow-frame";
import { BackupBody } from "../recovery/backup-body";
import { BackupFooter, backupTitle } from "../recovery/backup-footer";
import { useBackup } from "../recovery/use-backup";
import type { Welcome } from "./use-welcome";

export function WelcomeRecovery({ flow }: { flow: Welcome }) {
  const backup = useBackup({
    mode: "backup",
    persist: !flow.demo,
    onRecorded: () => {
      flow.setBackedUp(true);
    },
  });
  const next = () => {
    backup.wipe();
    flow.setStep(3);
  };
  return (
    <>
      <FlowFrame
        id={`welcome-recovery-${backup.step}`}
        steps={flow.steps}
        current={flow.index}
        art={{ tone: "pink", shape: "pink" }}
        promise={welcomeCopy.promises[2]}
        title={backupTitle(backup, "backup", true)}
        back={flow.back}
        backLabel={welcomeCopy.back}
        chip={flow.demo ? <Badge tone="lilac">{welcomeCopy.sample}</Badge> : undefined}
        footer={
          <BackupFooter
            backup={backup}
            mode="backup"
            onboarding
            onLater={next}
            onSkip={next}
            onClose={next}
            onContinue={next}
          />
        }
      >
        <BackupBody backup={backup} mode="backup" onboarding />
      </FlowFrame>
      {backup.prompt}
    </>
  );
}
