"use client";

import { useState } from "react";
import { useConfig, useConnection, useConnectors } from "wagmi";
import { connect, signMessage, switchChain } from "wagmi/actions";
import { useSpokeClient } from "@/lib/client/provider";
import { useSessionStore } from "@/lib/stores/session";
import { activeChain } from "@/lib/wagmi";
import { endPasskeySession, unlockPasskey } from "./passkey";
import { openWalletConnection } from "./reown";
import { signInAccount } from "./sign-in";

export type AuthOutcome = { isNewAccount: boolean };

type Connector = ReturnType<typeof useConnectors>[number];

const messageOf = (failure: unknown, fallback: string) =>
  failure instanceof Error && failure.message ? failure.message : fallback;

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
  const [busy, setBusy] = useState<"passkey" | "create" | "wallet" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const connected = connector ? await connect(config, { connector }) : connection;
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
    wallet,
    walletConnect,
    connected: connection.status === "connected",
    browserWallets: connectors
      .filter((connector) => connector.type !== "walletConnect")
      .map((connector) => ({
        connector,
        name: connector.id === "injected" ? "Browser wallet" : connector.name,
        icon: connector.icon,
      })),
  };
};
