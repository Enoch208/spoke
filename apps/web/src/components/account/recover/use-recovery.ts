"use client";

import { createSecretVaultWithNewPasskey } from "@category-labs/mera";
import { mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { useCallback, useRef } from "react";
import { rememberPasskey } from "@/lib/accounts/passkey-credential";
import { getAddress, keccak256, toHex, type Address, type Hex } from "viem";
import type { ClientOutput } from "@spoke/protocol";
import { useClientContext } from "@/lib/client/provider";
import { useSessionStore } from "@/lib/stores/session";
import { activeChain } from "@/lib/wagmi";
import { recoverCopy } from "../copy/recover";
import { keyFromMnemonic, type PhraseKey } from "../shared/keys";
import { CeremonyError } from "../shared/outcome";
import { sameWords, unknownSamplePhrase } from "../shared/phrase";

type Me = ClientOutput<"account.me">;
type Method = "phrase" | "passkey";
export type Derived = { address: Address; profile: Me | null };
export type SignInResult =
  { kind: "noAccount" } | { kind: "signedIn"; me: Me; isNew: boolean; recorded: boolean };

const unknownSampleAddress = getAddress(
  `0x${keccak256(toHex("spoke sample unknown phrase")).slice(-40)}`,
);

const transportsOf = (values: readonly string[] | undefined) =>
  (values ?? []).filter(
    (value): value is "usb" | "nfc" | "ble" | "internal" | "hybrid" | "smart-card" =>
      ["usb", "nfc", "ble", "internal", "hybrid", "smart-card"].includes(value),
  );

const demoPause = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 600);
  });

export function useRecovery(ask: (kind: "passkey") => Promise<void>) {
  const { client, mode } = useClientContext();
  const key = useRef<PhraseKey | null>(null);
  const unknownDemo = useRef(false);

  const forget = useCallback(() => {
    key.current?.end();
    key.current = null;
  }, []);

  const derive = async (words: readonly string[]): Promise<Derived> => {
    forget();
    if (mode === "demo") {
      unknownDemo.current = sameWords(words, unknownSamplePhrase);
      if (!client) throw new CeremonyError("failed");
      const me = await client.call("account.me", {});
      return unknownDemo.current
        ? { address: unknownSampleAddress, profile: null }
        : { address: getAddress(me.address), profile: me };
    }
    key.current = keyFromMnemonic(words.join(" "));
    return { address: key.current.address, profile: null };
  };

  const signWith = async (method: Method, purpose: "signIn" | "confirm", action?: string) => {
    const current = key.current;
    if (!client || !current) throw new CeremonyError("failed");
    const challenge = await client.call("auth.challenge", {
      address: current.address,
      chainId: activeChain.id,
      accountKind: method,
      purpose,
      ...(action ? { action } : {}),
    });
    const signature: Hex = await current.sign(challenge.message);
    return client.call("auth.verify", { message: challenge.message, signature, method });
  };

  const openSession = async (address: Address, expiresAt: string, isNew: boolean) => {
    if (!client) throw new CeremonyError("failed");
    const me = await client.call("account.me", {});
    useSessionStore.getState().signIn({
      address,
      accountKind: "passkey",
      sessionExpiresAt: expiresAt,
      isMerchant: me.isMerchant,
      isOperator: me.isOperator,
    });
    const recorded = await client.call("account.recordRecoveryCheck", {}).then(
      () => true,
      () => false,
    );
    return { kind: "signedIn" as const, me, isNew, recorded };
  };

  const signIn = async (create: boolean): Promise<SignInResult> => {
    if (mode === "demo") {
      await demoPause();
      if (!client) throw new CeremonyError("failed");
      if (unknownDemo.current && !create) return { kind: "noAccount" };
      return {
        kind: "signedIn",
        me: await client.call("account.me", {}),
        isNew: create,
        recorded: true,
      };
    }
    const verified = await signWith(create ? "passkey" : "phrase", "signIn");
    if ("csrfToken" in verified)
      return openSession(getAddress(verified.address), verified.expiresAt, verified.isNewAccount);
    if ("session" in verified) return { kind: "noAccount" };
    throw new CeremonyError("failed");
  };

  const addPasskey = async (words: readonly string[]): Promise<string> => {
    const label = recoverCopy.passkey.label;
    if (mode === "demo") {
      await ask("passkey");
      return label;
    }
    if (!client) throw new CeremonyError("failed");
    const secret = mnemonicToEntropy(words.join(" "), wordlist);
    const vault = await createSecretVaultWithNewPasskey({
      rp: { id: location.hostname, name: "Spoke" },
      user: { name: `spoke-${crypto.randomUUID()}`, displayName: "Spoke account" },
      secret,
    }).finally(() => {
      secret.fill(0);
    });
    const confirmation = await signWith("phrase", "confirm", "account.addPasskey");
    if (!("confirmationToken" in confirmation)) throw new CeremonyError("failed");
    const transports = transportsOf(vault.credential.transports);
    await client.call("account.addPasskey", {
      credentialId: vault.credential.credentialId,
      kind: "added",
      transports,
      label,
      confirmationToken: confirmation.confirmationToken,
      vault: {
        version: vault.version,
        credential: { credentialId: vault.credential.credentialId, transports },
        prfSalt: vault.prfSalt,
        nonce: vault.nonce,
        ciphertext: vault.ciphertext,
      },
    });
    rememberPasskey({ ...vault.credential, transports, kind: "added" });
    return label;
  };

  return { derive, signIn, addPasskey, forget };
}
