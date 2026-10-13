"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { storedPasskey } from "@/lib/accounts/passkey";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { securityCopy } from "../../copy/security";
import { sharedCopy } from "../../copy/shared";
import { errorText } from "../../shared/error-text";
import { SettingsCard, SettingsCardSkeleton } from "../settings-card";
import { PasskeyRow } from "./passkey-row";
import { usePasskeyActions } from "./use-passkey-actions";

const copy = securityCopy.passkeys;

const subscribeBrowser = (listener: () => void) => {
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("storage", listener);
  };
};

export function PasskeysCard({ me }: { me: ClientOutput<"account.me"> }) {
  const { mode } = useClientContext();
  const passkeys = useClientQuery("account.passkeys", {}, { enabled: me.accountKind !== "wallet" });
  const actions = usePasskeyActions();
  const now = useNow();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(
    subscribeBrowser,
    () => true,
    () => false,
  );
  const device = hydrated && mode !== "demo" ? (storedPasskey()?.credentialId ?? null) : null;
  const supported = !hydrated || mode === "demo" || "PublicKeyCredential" in window;
  const local = hydrated && mode !== "demo" && location.hostname === "localhost";

  if (me.accountKind === "wallet")
    return (
      <SettingsCard title={copy.title} description={copy.wallet}>
        <Button asChild variant="secondary" className="w-fit">
          <Link href={routes.settings.wallets}>{copy.walletLink}</Link>
        </Button>
      </SettingsCard>
    );
  if (passkeys.isPending) return <SettingsCardSkeleton rows={2} />;
  if (passkeys.isError)
    return (
      <ErrorState
        title={copy.loadFailed}
        body={passkeys.error.message}
        actions={
          <Button variant="secondary" onClick={() => void passkeys.refetch()}>
            {sharedCopy.retry}
          </Button>
        }
      />
    );

  const add = async () => {
    setAdding(true);
    setError(null);
    try {
      await actions.addPasskey();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setAdding(false);
    }
  };
  const backedUp = me.recovery.checkedAt !== null;
  return (
    <SettingsCard
      title={copy.title}
      description={local ? `${copy.help} ${copy.devHelp}` : copy.help}
      actions={
        <Button
          icon={Add01Icon}
          loading={adding}
          loadingLabel={copy.adding}
          disabled={!supported}
          {...(supported ? {} : { disabledReason: copy.unsupported })}
          onClick={() => void add()}
        >
          {copy.add}
        </Button>
      }
    >
      <ul className="divide-hairline flex flex-col divide-y">
        {passkeys.data.map((passkey) => (
          <PasskeyRow
            key={passkey.credentialId}
            passkey={passkey}
            address={me.address}
            thisDevice={passkey.credentialId === device}
            now={now}
            removeBlocked={passkey.credentialId === device && !backedUp}
            onRename={(label) => actions.rename(passkey.credentialId, label)}
            onRemove={() => actions.removePasskey(passkey.credentialId)}
          />
        ))}
      </ul>
      {error ? <Callout tone="caution">{error}</Callout> : null}
      {actions.prompt}
    </SettingsCard>
  );
}
