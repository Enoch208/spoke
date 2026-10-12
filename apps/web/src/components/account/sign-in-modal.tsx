"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfig, useConnectors, useConnection } from "wagmi";
import { connect, signMessage, switchChain } from "wagmi/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { useSpokeClient } from "@/lib/client/provider";
import { signInAccount } from "@/lib/accounts/sign-in";
import { endPasskeySession, unlockPasskey } from "@/lib/accounts/passkey";
import { openWalletConnection } from "@/lib/accounts/reown";
import { activeChain } from "@/lib/wagmi";
import { useSessionStore } from "@/lib/stores/session";
import { internalPath } from "@/lib/demo/landing";

export default function SignInModal<K extends "M-01" | "M-02" | "M-03">({
  props,
  close,
}: ModalComponentProps<K>) {
  const client = useSpokeClient();
  const config = useConfig();
  const connectors = useConnectors();
  const connection = useConnection();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finish = async (create: boolean) => {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const { account, credential } = await unlockPasskey(create);
      if (
        props.expectedAddress &&
        account.address.toLowerCase() !== props.expectedAddress.toLowerCase()
      )
        throw new Error("Choose the passkey for your original account to continue this action.");
      const result = await signInAccount(client, account.address, "passkey", (message) =>
        account.signMessage({ message }),
      );
      if (create)
        await client.call("account.addPasskey", {
          ...credential,
          transports: credential.transports,
          kind: "original",
          label: "Original passkey",
        });
      endPasskeySession();
      close();
      router.push(
        result.verified.isNewAccount && props.reason === "open"
          ? "/welcome"
          : (internalPath(props.returnTo) ?? (props.reason === "sell" ? "/sell" : "/earn")),
      );
    } catch (failure) {
      endPasskeySession();
      useSessionStore.getState().setStatus("anonymous");
      setError(
        failure instanceof Error
          ? failure.message
          : "The passkey could not be opened. Try again or use a wallet.",
      );
    } finally {
      setBusy(false);
    }
  };
  const wallet = async (connector?: (typeof connectors)[number]) => {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const connected = connector ? await connect(config, { connector }) : connection;
      const address = "accounts" in connected ? connected.accounts[0] : connected.address;
      if (!address) throw new Error("Choose a wallet first.");
      if (props.expectedAddress && address.toLowerCase() !== props.expectedAddress.toLowerCase())
        throw new Error("Connect your original account to continue this action.");
      if (connected.chainId !== activeChain.id)
        await switchChain(config, { chainId: activeChain.id });
      const result = await signInAccount(client, address, "wallet", (message) =>
        signMessage(config, { account: address, message }),
      );
      close();
      router.push(
        result.verified.isNewAccount && props.reason === "open"
          ? "/welcome"
          : (internalPath(props.returnTo) ?? (props.reason === "sell" ? "/sell" : "/earn")),
      );
    } catch (failure) {
      useSessionStore.getState().setStatus("anonymous");
      setError(failure instanceof Error ? failure.message : "Wallet sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
      title="Your account, your keys"
      subtitle="Use a passkey or a wallet. Spoke never holds your money."
      closeDisabled={busy}
    >
      <div className="grid gap-3">
        <Button block loading={busy} onClick={() => void finish(false)}>
          Continue with passkey
        </Button>
        <Button block variant="secondary" disabled={busy} onClick={() => void finish(true)}>
          Create a passkey account
        </Button>
        <p className="text-subtle text-sm">
          Passkeys use Face ID, Touch ID or a security key. Your provider must support the PRF
          extension. Back up your recovery phrase after signing in.
        </p>
        <div className="border-hairline my-1 border-t" />
        {connection.status === "connected" ? (
          <Button block variant="secondary" loading={busy} onClick={() => void wallet()}>
            Sign in with connected wallet
          </Button>
        ) : (
          connectors
            .filter((connector) => connector.type !== "walletConnect")
            .map((connector) => (
              <Button
                key={connector.uid}
                variant="secondary"
                disabled={busy}
                onClick={() => void wallet(connector)}
              >
                {connector.name}
              </Button>
            ))
        )}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void openWalletConnection().catch((failure: unknown) => {
              setError(
                failure instanceof Error ? failure.message : "WalletConnect could not be opened.",
              );
            })
          }
        >
          More wallets · WalletConnect
        </Button>
        {error ? (
          <p role="alert" className="bg-pink-soft text-pink-ink rounded-xl p-3 text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
