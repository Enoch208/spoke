"use client";

import { Alert02Icon, CheckmarkCircle02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";
import { securityCopy } from "../../copy/security";
import { formatDay } from "../../shared/dates";
import { SettingsCard } from "../settings-card";

const copy = securityCopy.recovery;

export function RecoveryCard({ me }: { me: ClientOutput<"account.me"> }) {
  const open = useUiStore((state) => state.open);
  if (me.accountKind === "wallet")
    return (
      <SettingsCard
        title={copy.title}
        chip={<StatusChip label={copy.walletChip} icon={Wallet01Icon} tone="faint" />}
        description={copy.wallet}
      />
    );
  const checkedAt = me.recovery.checkedAt;
  return (
    <SettingsCard
      title={copy.title}
      className={checkedAt ? undefined : "border-amber-deep/40"}
      chip={
        checkedAt ? (
          <StatusChip label={copy.backedUp} icon={CheckmarkCircle02Icon} tone="lime" />
        ) : (
          <StatusChip label={copy.notBackedUp} icon={Alert02Icon} tone="amber" />
        )
      }
      description={
        checkedAt
          ? fill(copy.checked, { date: formatDay(new Date(checkedAt)) })
          : copy.notBackedUpBody
      }
    >
      <div className="flex flex-wrap gap-2">
        {checkedAt ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                open("M-04", { mode: "check", origin: "settings" });
              }}
            >
              {copy.check}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                open("M-04", { mode: "reveal", origin: "settings" });
              }}
            >
              {copy.reveal}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              open("M-04", { mode: "backup", origin: "settings" });
            }}
          >
            {copy.backUp}
          </Button>
        )}
      </div>
    </SettingsCard>
  );
}
