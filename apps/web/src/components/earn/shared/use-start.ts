"use client";

import { usePathname } from "next/navigation";
import { useTxEngine } from "@/components/app/tx/tx-provider";
import { featureStatus } from "@/lib/features";
import { useModeStore } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { actions } from "@/lib/tx/actions";
import type { TxKind, TxParamsMap } from "@/lib/tx/types";
import { activeChain } from "@/lib/wagmi";

export function useStartTx() {
  const engine = useTxEngine();
  const pathname = usePathname();
  return <K extends TxKind>(kind: K, params: TxParamsMap[K]): string | null => {
    const session = useSessionStore.getState();
    const mode = useModeStore.getState().mode;
    const ui = useUiStore.getState();
    if (!session.address || session.status !== "signedIn") {
      ui.open("M-01", { reason: kind === "createNode" ? "share" : "open", returnTo: pathname });
      return null;
    }
    const feature = actions[kind].feature;
    if (mode === "live" && featureStatus(feature) !== "live") {
      ui.open("M-44", { featureKey: feature, returnTo: pathname });
      return null;
    }
    return engine.start(kind, params, { mode, account: session.address, chainId: activeChain.id });
  };
}

export const closeSheetFor = (txId: string) => {
  const ui = useUiStore.getState();
  const entry = ui.modals.find(
    (modal) => modal.id === "M-11" && "txId" in modal.props && modal.props.txId === txId,
  );
  if (entry) ui.close(entry.key);
};
