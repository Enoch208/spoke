"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClientOutput } from "@spoke/protocol";
import { endPasskeySession } from "@/lib/accounts/passkey";
import { disconnectEmailWallet } from "@/lib/accounts/reown";
import { useClientContext } from "@/lib/client/provider";
import { isClientError } from "@/lib/client/errors";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus } from "@/lib/tx/records";
import { privacyCopy as copy } from "../copy/privacy";
import { errorText } from "../shared/error-text";
import { useStepUp } from "../shared/step-up";
import { toast } from "../shared/toast";

const download = (value: unknown, filename: string) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};

export function useDataRights(close: () => void) {
  const { client, mode } = useClientContext();
  const me = useClientQuery("account.me", {});
  const campaigns = useClientQuery(
    "campaigns.mine",
    { limit: 100 },
    { enabled: me.data?.isMerchant === true },
  );
  const stepUp = useStepUp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ClientOutput<"account.exportData"> | null>(null);
  const demo = mode === "demo";
  const pendingTx = useTxStore((state) =>
    state.records.some(
      (record) =>
        record.mode === mode &&
        record.account.toLowerCase() === me.data?.address.toLowerCase() &&
        ["wallet_confirmation", "submitted", "included", "confirmed", "unknown"].includes(
          overallStatus(record),
        ),
    ),
  );
  const active = campaigns.data?.items.some((campaign) =>
    ["FUNDED_ACTIVE", "ACTIVE", "PAUSED", "active", "paused"].includes(campaign.state),
  );
  const run = async (action: "export" | "delete") => {
    if (!client || (action === "delete" && (pendingTx || active || demo))) return;
    setBusy(true);
    setError(null);
    const method = action === "export" ? "account.exportData" : "account.deleteAccount";
    try {
      let confirmationToken = await stepUp.confirm(method);
      const execute = () =>
        action === "export"
          ? client.call("account.exportData", { confirmationToken })
          : client.call("account.deleteAccount", {
              confirmationToken,
              typedConfirmation: "delete my account",
            });
      const result = await execute().catch(async (failure: unknown) => {
        if (!isClientError(failure) || failure.code !== "REAUTH_REQUIRED") throw failure;
        confirmationToken = await stepUp.confirm(method);
        return execute();
      });
      if (action === "delete") {
        endPasskeySession();
        await disconnectEmailWallet().catch(() => undefined);
        useSessionStore.getState().signOut();
        close();
        router.push("/");
        toast("T-43", copy.deleted);
      } else if ("jobId" in result) {
        if (demo) {
          const [profile, preferences, wallets, passkeys, sessions, notifications, links] =
            await Promise.all([
              client.call("account.me", {}),
              client.call("account.preferences", {}),
              client.call("account.wallets", {}),
              client.call("account.passkeys", {}),
              client.call("account.sessions", {}),
              client.call("notifications.list", { limit: 100 }),
              client.call("links.mine", { limit: 100 }),
            ]);
          download(
            {
              mode: "demo",
              notice: copy.sample,
              profile,
              preferences,
              wallets,
              passkeys,
              sessions,
              notifications,
              links,
            },
            `spoke-sample-export-${profile.handle ?? "account"}.json`,
          );
          toast("T-36", copy.ready);
          close();
        } else setJob(result);
      }
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  };
  return { me, demo, busy, error, job, run, prompt: stepUp.prompt, active, campaigns, pendingTx };
}
