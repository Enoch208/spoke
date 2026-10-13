"use client";

import { createSecretVaultWithNewPasskey } from "@category-labs/mera";
import { mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { useClientContext } from "@/lib/client/provider";
import { rememberPasskey } from "@/lib/accounts/passkey-credential";
import { useClientMutation } from "@/lib/query/use-client";
import { securityCopy } from "../../copy/security";
import { deviceLabel } from "../../shared/device-label";
import { passkeyMnemonic } from "../../shared/keys";
import { useStepUp } from "../../shared/step-up";
import { toast } from "../../shared/toast";

type Transport = "usb" | "nfc" | "ble" | "internal" | "hybrid" | "smart-card";
const transports: readonly Transport[] = ["usb", "nfc", "ble", "internal", "hybrid", "smart-card"];
const knownTransports = (values: readonly string[] | undefined) =>
  (values ?? []).filter((value): value is Transport => transports.some((known) => known === value));

export function usePasskeyActions() {
  const { mode, client } = useClientContext();
  const stepUp = useStepUp();
  const add = useClientMutation("account.addPasskey", ["account.passkeys", "notifications"]);
  const update = useClientMutation("account.updatePasskey", ["account.passkeys"]);
  const remove = useClientMutation("account.removePasskey", ["account.passkeys", "notifications"]);

  const addPasskey = async () => {
    const confirmationToken = await stepUp.confirm("account.addPasskey");
    const label = deviceLabel(navigator.userAgent);
    if (mode === "demo") {
      await stepUp.ask("passkey");
      await add.mutateAsync({
        credentialId: `demo-passkey-${String(Date.now())}`,
        kind: "added",
        transports: ["internal"],
        label,
        confirmationToken,
        vault: { demo: true },
      });
    } else {
      const secret = mnemonicToEntropy(await passkeyMnemonic(client), wordlist);
      try {
        const vault = await createSecretVaultWithNewPasskey({
          rp: { id: location.hostname, name: "Spoke" },
          user: { name: `spoke-${crypto.randomUUID()}`, displayName: "Spoke account" },
          secret,
        });
        const kept = knownTransports(vault.credential.transports);
        await add.mutateAsync({
          credentialId: vault.credential.credentialId,
          kind: "added",
          transports: kept,
          label,
          confirmationToken,
          vault: {
            version: vault.version,
            credential: { credentialId: vault.credential.credentialId, transports: kept },
            prfSalt: vault.prfSalt,
            nonce: vault.nonce,
            ciphertext: vault.ciphertext,
          },
        });
        rememberPasskey({ ...vault.credential, transports: kept, kind: "added" });
      } finally {
        secret.fill(0);
      }
    }
    toast("T-02", securityCopy.passkeys.addedToast);
  };

  const rename = async (credentialId: string, label: string) => {
    await update.mutateAsync({ credentialId, label });
    toast("T-02", securityCopy.passkeys.renamedToast);
  };

  const removePasskey = async (credentialId: string) => {
    const confirmationToken = await stepUp.confirm("account.removePasskey");
    await remove.mutateAsync({ credentialId, confirmationToken });
    toast("T-02", securityCopy.passkeys.removedToast);
  };

  return { addPasskey, rename, removePasskey, prompt: stepUp.prompt, kind: stepUp.kind };
}
