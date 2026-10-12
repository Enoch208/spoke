"use client";

import { usePathname } from "next/navigation";
import { useFeatureGate } from "@/components/app/feature-gate";
import { useTxEngine } from "@/components/app/tx/tx-provider";
import { useModeStore } from "../stores/mode";
import { useSessionStore } from "../stores/session";
import { useUiStore } from "../stores/ui";
import { activeChain } from "../wagmi";
import { actions } from "./actions";
import type { TxKind, TxParamsMap } from "./types";

export function useChainAction() {
  const engine = useTxEngine();
  const pathname = usePathname();
  const featureGate = useFeatureGate();
  return <K extends TxKind>(kind: K, params: TxParamsMap[K]) => {
    const session = useSessionStore.getState();
    const mode = useModeStore.getState().mode;
    if (!session.address || session.status !== "signedIn") {
      useUiStore.getState().open("M-01", {
        reason: kind === "purchase" ? "buy" : kind === "createNode" ? "share" : "sell",
        returnTo: pathname,
      });
      return;
    }
    const account = session.address;
    featureGate(actions[kind].feature, () =>
      engine.start(kind, params, { mode, account, chainId: activeChain.id }),
    );
  };
}
