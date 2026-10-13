"use client";

import type { ClientOutput } from "@spoke/protocol";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTxEngine } from "@/components/app/tx/tx-provider";
import { isClientError } from "@/lib/client/errors";
import { useSpokeClient } from "@/lib/client/provider";
import { useCheckoutStore } from "@/lib/stores/checkout";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { useChainAction } from "@/lib/tx/use-action";
import { activeChain } from "@/lib/wagmi";
import { lockedOrder, type RecordView } from "./model";
import { sameTerms } from "./split";
import type { PurchaseRecord } from "./use-purchase-record";

type Preview = ClientOutput<"checkout.preview">;

export type CheckoutNotice = "termsChanged" | "apiDown" | "stillChecking" | null;

const termsCodes = new Set(["POLICY_MISMATCH", "PRODUCT_VERSION_MISMATCH"]);

export function useCheckoutActions(input: {
  campaignId: string;
  nodeId: string;
  record: PurchaseRecord | null;
  view: RecordView;
  reviewed: Preview | undefined;
  product: { title: string; merchant: string } | null;
  signedIn: boolean;
  fundsReady: boolean;
  onStart: (started: boolean) => void;
  onKey: (key: string) => void;
  onDirect: () => void;
  refetchPreview: () => Promise<unknown>;
}) {
  const client = useSpokeClient();
  const engine = useTxEngine();
  const start = useChainAction();
  const pathname = usePathname();
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<CheckoutNotice>(null);
  const returnTo = `${pathname}${search.size > 0 ? `?${search.toString()}` : ""}`;

  const signIn = (kind: "M-01" | "M-03") => {
    useUiStore.getState().open(kind, { reason: "buy", returnTo });
  };

  const purchase = async () => {
    const address = useSessionStore.getState().address;
    if (!client || !input.reviewed || !input.product || !address) return;
    setBusy(true);
    setNotice(null);
    try {
      const fresh = await client.call("checkout.preview", {
        campaignId: input.campaignId,
        node: input.nodeId,
        buyer: address,
      });
      if (!sameTerms(input.reviewed, fresh)) {
        setNotice("termsChanged");
        input.onStart(false);
        await input.refetchPreview();
        return;
      }
      if (fresh.blocking || BigInt(fresh.buyer?.tokenBalance ?? "0") < BigInt(fresh.price)) {
        await input.refetchPreview();
        return;
      }
      const store = useCheckoutStore.getState();
      const draft = store.startDraft(input.campaignId, input.nodeId === "0" ? null : input.nodeId);
      input.onKey(draft.orderKey);
      const intentId =
        draft.intentId ??
        (
          await client.call("checkout.createIntent", {
            campaignId: input.campaignId,
            nodeId: input.nodeId,
            orderKey: draft.orderKey,
            expectedPrice: fresh.price,
            expectedReward: fresh.rewardTotal,
            policyHash: fresh.policyHash,
            chainId: activeChain.id,
          })
        ).id;
      store.updateDraft(input.campaignId, { intentId, step: "pay" });
      start("purchase", {
        campaignId: input.campaignId,
        nodeId: input.nodeId,
        orderKey: draft.orderKey,
        price: fresh.price,
        productTitle: input.product.title,
        merchantName: input.product.merchant,
        intentId,
      });
    } catch (failure) {
      if (isClientError(failure) && termsCodes.has(failure.code)) {
        setNotice("termsChanged");
        input.onStart(false);
        await input.refetchPreview();
      } else setNotice("apiDown");
    } finally {
      setBusy(false);
    }
  };

  const buy = () => {
    input.onStart(true);
    if (!input.signedIn || !input.fundsReady) return;
    void purchase();
  };

  const retry = () => {
    const record = input.record;
    if (!record) return;
    if (input.view.kind === "stopped" && input.view.reason === "interrupted")
      engine.continueInterrupted(record.id);
    else engine.retry(record.id);
  };

  const checkAgain = () => {
    if (input.record) engine.checkAgain(input.record.id);
  };

  const chooseDirect = () => {
    if (lockedOrder(input.view)) {
      setNotice("stillChecking");
      return;
    }
    setNotice(null);
    input.onDirect();
  };

  return {
    busy,
    notice,
    buy,
    pay: () => void purchase(),
    retry,
    checkAgain,
    chooseDirect,
    signIn,
    returnTo,
  };
}
