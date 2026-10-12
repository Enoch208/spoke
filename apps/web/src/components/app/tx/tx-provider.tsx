"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPublicClient, http, type PublicClient } from "viem";
import { useConfig } from "wagmi";
import { useClientContext } from "@/lib/client/provider";
import { keyForTarget } from "@/lib/query/keys";
import { publicEnv } from "@/lib/public-env";
import { routeTo } from "@/lib/routes";
import { useStoresHydrated } from "@/lib/stores/hydration";
import { useModeStore } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { createChainReader } from "@/lib/tx/chain-reader";
import { TxEngine, type TxStoreApi } from "@/lib/tx/engine";
import { runLiveStep } from "@/lib/tx/live-step";
import { runDemoStep } from "@/lib/tx/demo-step";
import { notifyTxEvent } from "@/lib/tx/notifier";
import { realClock, type LivePorts } from "@/lib/tx/ports";
import { walletSigner } from "@/lib/tx/wallet-signer";
import { passkeySigner } from "@/lib/accounts/passkey";
import { preparePasskeySigning, afterPasskeySigning } from "@/lib/accounts/quick-actions";
import { activeChain } from "@/lib/wagmi";
import { attachCheckoutHash, copyLinkFor, explorerTx, reportTx } from "./tx-effects";

const TxEngineContext = createContext<TxEngine | null>(null);

const storeApi: TxStoreApi = {
  records: () => useTxStore.getState().records,
  upsert: (record) => {
    useTxStore.getState().upsert(record);
  },
  patchRecord: (id, patch) => {
    useTxStore.getState().patchRecord(id, patch);
  },
  patchStep: (id, stepId, patch) => {
    useTxStore.getState().patchStep(id, stepId, patch);
  },
  remove: (id) => {
    useTxStore.getState().remove(id);
  },
};

const contractAddresses = () => {
  const protocol = publicEnv.NEXT_PUBLIC_PROTOCOL_ADDRESS;
  const token = publicEnv.NEXT_PUBLIC_DEMO_TOKEN_ADDRESS;
  return protocol && token ? { protocol, token } : null;
};

const openSheet = (txId: string) => {
  const { modals, open } = useUiStore.getState();
  const top = modals.at(-1);
  if (top?.id === "M-11" && "txId" in top.props && top.props.txId === txId) return;
  open("M-11", { txId });
};

export function TxEngineProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const wagmiConfig = useConfig();
  const router = useRouter();
  const { live } = useClientContext();
  const hydrated = useStoresHydrated();
  const status = useSessionStore((state) => state.status);
  const address = useSessionStore((state) => state.address);
  const mode = useModeStore((state) => state.mode);

  const [engine] = useState(() => {
    const publicClient: PublicClient = createPublicClient({
      chain: activeChain,
      transport: http(`${publicEnv.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/v1/rpc`),
    });
    const addresses = contractAddresses();
    const livePorts: LivePorts = {
      addresses,
      chainId: activeChain.id,
      reader: createChainReader(publicClient, addresses ?? { protocol: "0x", token: "0x" }),
      signer: () => {
        const session = useSessionStore.getState();
        if (!session.address) return null;
        if (session.accountKind === "passkey") return passkeySigner(session.address);
        return walletSigner(wagmiConfig, session.address);
      },
      index: {
        indexedBlock: async () => {
          const health = await live.call("system.health", {});
          return health.indexer.lastBlock === null ? null : BigInt(health.indexer.lastBlock);
        },
      },
    };
    const instance: TxEngine = new TxEngine({
      store: storeApi,
      clock: realClock,
      ports: () => livePorts,
      runner: (mode) => (mode === "demo" ? runDemoStep : runLiveStep),
      invalidate: async (record) => {
        await Promise.all(
          record.invalidates.map((target) =>
            queryClient.invalidateQueries({ queryKey: keyForTarget(record.mode, target) }),
          ),
        );
      },
      emit: (event) => {
        notifyTxEvent(event, {
          push: (toast) => useUiStore.getState().pushToast(toast),
          dismiss: (id, subject) => {
            const ui = useUiStore.getState();
            for (const toast of ui.toasts) {
              if (toast.id === id && toast.subject === subject) ui.dismissToast(toast.key);
            }
          },
          markNoticeShown: (id) => {
            useTxStore.getState().patchRecord(id, { backgroundNoticeShown: true });
          },
          show: (id) => {
            instance.show(id);
          },
          showList: () => useUiStore.getState().open("M-11", { view: "list" }),
          retry: (id) => {
            instance.retry(id);
          },
          continueRun: (id) => {
            instance.continueInterrupted(id);
          },
          report: reportTx,
          runDoneAction: (record, action) => {
            if (action.kind === "openCampaign")
              router.push(routeTo.sellCampaign(action.campaignId));
            if (action.kind === "openPurchase") router.push(routeTo.purchase(action.saleId));
            if (action.kind === "copyLink") void copyLinkFor(live, action.nodeId);
            if (action.kind === "show") instance.show(record.id);
            if (action.kind === "viewTransaction")
              explorerTx(record, () => {
                instance.show(record.id);
              });
          },
          viewingDemo: () => useModeStore.getState().mode === "demo",
        });
      },
      openSheet,
      beforeSign: (record, signer) =>
        signer.kind === "passkey" ? preparePasskeySigning(record) : Promise.resolve(),
      afterHash: (record, hash) => {
        afterPasskeySigning();
        attachCheckoutHash(live, record, hash);
      },
      newId: () => crypto.randomUUID(),
    });
    return instance;
  });

  useEffect(() => {
    if (!hydrated || status !== "signedIn" || !address) return;
    engine.resumeAfterReload(address, mode);
  }, [engine, hydrated, status, address, mode]);

  return <TxEngineContext.Provider value={engine}>{children}</TxEngineContext.Provider>;
}

export const useTxEngine = () => {
  const engine = useContext(TxEngineContext);
  if (!engine) throw new Error("useTxEngine must be used inside TxEngineProvider");
  return engine;
};
