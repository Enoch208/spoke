"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useConfig, useConnection, useConnectors } from "wagmi";
import { connect, getConnection, signMessage, switchChain } from "wagmi/actions";
import { useSpokeClient } from "@/lib/client/provider";
import { useSessionStore } from "@/lib/stores/session";
import { activeChain } from "@/lib/wagmi";
import { endPasskeySession, unlockPasskey } from "./passkey";
import { emailLoginAvailable, openEmailConnection, openWalletConnection } from "./reown";
import { signInAccount } from "./sign-in";

export type AuthOutcome = { isNewAccount: boolean };

type Connector = ReturnType<typeof useConnectors>[number];

const messageOf = (failure: unknown, fallback: string) =>
  failure instanceof Error && failure.message ? failure.message : fallback;
const subscribeHydration = () => () => {};

export const useAccountAuth = ({
  expectedAddress,
  onSignedIn,
}: {
  expectedAddress?: string | undefined;
  onSignedIn: (outcome: AuthOutcome) => void;
}) => {
  const client = useSpokeClient();
  const config = useConfig();
  const connectors = useConnectors();
  const connection = useConnection();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState<"passkey" | "create" | "wallet" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emailAttempt = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      emailAttempt.current?.abort();
      emailAttempt.current = null;
    },
    [],
  );

  const matchesExpected = (address: string) =>
    !expectedAddress || address.toLowerCase() === expectedAddress.toLowerCase();

  const passkey = async (create: boolean) => {
    if (!client) return;
    setBusy(create ? "create" : "passkey");
    setError(null);
    try {
      const { account, credential } = await unlockPasskey(create, client);
      if (!matchesExpected(account.address))
        throw new Error("Choose the passkey for your original account to continue.");
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
      onSignedIn({ isNewAccount: result.verified.isNewAccount });
    } catch (failure) {
      endPasskeySession();
      useSessionStore.getState().setStatus("anonymous");
      setError(messageOf(failure, "The passkey couldn’t be opened. Try again or use a wallet."));
    } finally {
      setBusy(null);
    }
  };

  const wallet = async (connector?: Connector) => {
    if (!client) return;
    setBusy("wallet");
    setError(null);
    try {
      const connected = connector ? await connect(config, { connector }) : getConnection(config);
      const address = "accounts" in connected ? connected.accounts[0] : connected.address;
      if (!address) throw new Error("Choose a wallet first.");
      if (!matchesExpected(address)) throw new Error("Connect your original account to continue.");
      if (connected.chainId !== activeChain.id)
        await switchChain(config, { chainId: activeChain.id });
      const result = await signInAccount(client, address, "wallet", (message) =>
        signMessage(config, { account: address, message }),
      );
      onSignedIn({ isNewAccount: result.verified.isNewAccount });
    } catch (failure) {
      useSessionStore.getState().setStatus("anonymous");
      setError(messageOf(failure, "Wallet sign-in didn’t finish. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const email = async () => {
    if (!client || busy || emailAttempt.current) return;
    const attempt = new AbortController();
    emailAttempt.current = attempt;
    setBusy("email");
    setError(null);
    try {
      const address = await openEmailConnection(attempt.signal);
      if (!address || attempt.signal.aborted) return;
      if (!matchesExpected(address))
        throw new Error("Use the email, passkey or wallet for your original account to continue.");
      const connected = getConnection(config);
      if (
        connected.status !== "connected" ||
        connected.address.toLowerCase() !== address.toLowerCase()
      )
        throw new Error("Your connected account changed. Please sign in again.");
      if (connected.chainId !== activeChain.id)
        await switchChain(config, { chainId: activeChain.id, connector: connected.connector });
      const result = await signInAccount(client, address, "wallet", (message) =>
        signMessage(config, { account: address, connector: connected.connector, message }),
      );
      if (emailAttempt.current === attempt)
        onSignedIn({ isNewAccount: result.verified.isNewAccount });
    } catch (failure) {
      if (!attempt.signal.aborted) {
        useSessionStore.getState().setStatus("anonymous");
        setError(messageOf(failure, "Email sign-in didn’t finish. Please try again."));
      }
    } finally {
      emailAttempt.current = null;
      setBusy(null);
    }
  };

  const walletConnect = () => {
    setError(null);
    openWalletConnection().catch((failure: unknown) => {
      setError(messageOf(failure, "WalletConnect couldn’t be opened."));
    });
  };

  return {
    busy,
    error,
    passkey,
    email,
    emailAvailable: emailLoginAvailable,
    wallet,
    walletConnect,
    connected: hydrated && connection.status === "connected",
    browserWallets: (hydrated ? connectors : [])
      .filter((connector) => connector.type !== "walletConnect" && connector.type !== "AUTH")
      .filter(
        (connector, index, all) => all.findIndex((item) => item.id === connector.id) === index,
      )
      .map((connector) => ({
        connector,
        name: connector.id === "injected" ? "Browser wallet" : connector.name,
        icon: connector.icon,
      })),
  };
};
