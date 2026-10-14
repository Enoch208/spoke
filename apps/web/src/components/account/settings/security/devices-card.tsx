"use client";

import { SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClientInput } from "@spoke/protocol";
import { QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { endPasskeySession } from "@/lib/accounts/passkey";
import { disconnectEmailWallet } from "@/lib/accounts/reown";
import { fill } from "@/lib/copy";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useNow } from "@/lib/use-now";
import { securityCopy } from "../../copy/security";
import { SettingsCard } from "../settings-card";

const copy = securityCopy.devices;

export function DevicesCard() {
  const devices = useClientQuery("account.sessions", {});
  const revoke = useClientMutation("account.revokeSession", ["account.sessions"]);
  const signOut = useClientMutation("auth.signOut", []);
  const router = useRouter();
  const now = useNow();
  const [confirm, setConfirm] = useState<ClientInput<"account.revokeSession"> | null>(null);
  const others = devices.data?.filter((device) => !device.isCurrent).length ?? 0;
  const run = () => {
    if (!confirm) return;
    const current =
      "scope" in confirm
        ? confirm.scope === "all"
        : devices.data?.some((device) => device.id === confirm.sessionId && device.isCurrent);
    const finish = async () => {
      setConfirm(null);
      endPasskeySession();
      await disconnectEmailWallet().catch(() => undefined);
      useSessionStore.getState().signOut();
      router.push("/login");
    };
    if (current && "sessionId" in confirm) signOut.mutate({}, { onSuccess: () => void finish() });
    else
      revoke.mutate(confirm, {
        onSuccess: () => {
          setConfirm(null);
          if (current) signOut.mutate({}, { onSuccess: () => void finish() });
        },
      });
  };
  return (
    <SettingsCard title={copy.title} description={copy.note}>
      <QueryState
        pending={devices.isPending}
        error={devices.error}
        retry={() => void devices.refetch()}
      >
        <ul className="divide-hairline divide-y">
          {devices.data?.map((device) => (
            <li
              key={device.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-ink flex flex-wrap items-center gap-2 font-medium">
                  {device.deviceLabel}
                  {device.isCurrent ? (
                    <StatusChip icon={SmartPhone01Icon} tone="sky" label={copy.thisDevice} />
                  ) : null}
                </p>
                <p className="text-body text-sm">{copy.methods[device.method]}</p>
                <p className="text-subtle text-sm">
                  {fill(copy.times, {
                    signedIn: formatRelative(new Date(device.signedInAt), { now: new Date(now) }),
                    active: formatRelative(new Date(device.lastActiveAt), { now: new Date(now) }),
                  })}
                </p>
                <p className="text-subtle text-xs">
                  {fill(copy.expires, { date: formatDateTime(new Date(device.expiresAt)) })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirm({ sessionId: device.id });
                }}
              >
                {device.isCurrent ? copy.signOutHere : copy.signOut}
              </Button>
            </li>
          ))}
        </ul>
        {others === 0 ? <p className="text-subtle text-sm">{copy.onlyThis}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={others === 0}
            onClick={() => {
              setConfirm({ scope: "others" });
            }}
          >
            {copy.signOutOthers}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setConfirm({ scope: "all" });
            }}
          >
            {copy.signOutAll}
          </Button>
        </div>
        {confirm ? (
          <div role="alert" className="bg-amber-soft mt-4 grid gap-3 rounded-xl p-4 text-sm">
            <p>
              {"scope" in confirm
                ? confirm.scope === "all"
                  ? copy.signOutAllConfirm
                  : fill(copy.signOutOthersConfirm, { n: String(others) })
                : "Sign out of this device? It will need to sign in again."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setConfirm(null);
                }}
              >
                {copy.cancel}
              </Button>
              <Button size="sm" loading={revoke.isPending || signOut.isPending} onClick={run}>
                {copy.confirm}
              </Button>
            </div>
          </div>
        ) : null}
        {revoke.error || signOut.error ? (
          <p role="alert" className="text-pink-ink mt-3 text-sm">
            {revoke.error?.message ?? signOut.error?.message}
          </p>
        ) : null}
      </QueryState>
    </SettingsCard>
  );
}
