"use client";

import { useState } from "react";
import { useConfig } from "wagmi";
import { switchChain } from "wagmi/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { activeChain } from "@/lib/wagmi";
import type { ModalComponentProps } from "@/components/app/modal-types";

export default function WrongNetworkModal({ props, close }: ModalComponentProps<"M-05">) {
  const config = useConfig();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const change = async () => {
    setBusy(true);
    try {
      await switchChain(config, { chainId: activeChain.id });
      close();
      props.resume?.();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Switch networks in your wallet and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      title="Switch to Monad Testnet"
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button loading={busy} onClick={() => void change()}>
            Switch network
          </Button>
        </>
      }
    >
      <p>
        Your wallet is on chain {props.currentChainId}. This action requires Monad Testnet (
        {activeChain.id}).
      </p>
      {error ? (
        <p role="alert" className="text-pink-ink mt-3">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
