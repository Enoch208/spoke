"use client";

import { CheckmarkCircle02Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { demoToken } from "@spoke/protocol";
import type { ClientOutput } from "@spoke/protocol";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { passkeySessionActive } from "@/lib/accounts/passkey";
import { chooseQuickActions, readQuickActions } from "@/lib/accounts/quick-actions";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { securityCopy } from "../../copy/security";
import { toast } from "../../shared/toast";
import { SettingsCard } from "../settings-card";

const copy = securityCopy.quick;

export function QuickActionsCard({ me }: { me: ClientOutput<"account.me"> }) {
  const [state, setState] = useState({ allowed: false, active: false, cap: "100000000" });
  useEffect(() => {
    const update = () => {
      const choice = readQuickActions();
      setState({
        allowed: choice?.choice === "allow",
        active: passkeySessionActive(),
        cap: choice?.capMinor ?? "100000000",
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  if (me.accountKind === "wallet")
    return <SettingsCard title={copy.title} description={copy.wallet} />;
  return (
    <SettingsCard
      title={copy.title}
      chip={
        <StatusChip
          label={state.allowed ? (state.active ? copy.on : copy.ready) : copy.off}
          icon={state.active ? CheckmarkCircle02Icon : Shield01Icon}
          tone={state.active ? "lime" : "faint"}
        />
      }
      description={state.allowed ? (state.active ? copy.onBody : copy.readyBody) : copy.offBody}
    >
      {state.allowed ? (
        <ul className="text-body list-inside list-disc space-y-1 text-sm">
          {copy.allowed.map((line) => (
            <li key={line}>{fill(line, { limit: formatAmount(BigInt(state.cap), demoToken) })}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-subtle text-sm">{copy.ends}</p>
      <p className="text-body text-sm">{copy.always}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => useUiStore.getState().open("M-09", { origin: "settings" })}
        >
          {state.allowed ? copy.change : copy.turnOn}
        </Button>
        {state.allowed ? (
          <Button
            variant="ghost"
            onClick={() => {
              chooseQuickActions("ask");
              setState((current) => ({ ...current, allowed: false, active: false }));
              toast("T-02", copy.endedToast);
            }}
          >
            {copy.endNow}
          </Button>
        ) : null}
      </div>
      <p className="text-subtle text-sm">{copy.honesty}</p>
    </SettingsCard>
  );
}
