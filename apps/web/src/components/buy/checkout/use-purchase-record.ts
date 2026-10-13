"use client";

import { useEffect, useRef } from "react";
import { useTxEngine } from "@/components/app/tx/tx-provider";
import type { Mode } from "@/lib/stores/mode";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import type { AnyTxRecord, TxRecord } from "@/lib/tx/types";
import { viewRecord, type RecordView } from "./model";

export type PurchaseRecord = TxRecord<"purchase">;

const isPurchase = (record: AnyTxRecord): record is PurchaseRecord => record.kind === "purchase";

const visibleSurfaces = new Map<string, number>();

export const checkoutVisible = (campaignId: string) => (visibleSurfaces.get(campaignId) ?? 0) > 0;

const purchaseFor = (records: readonly AnyTxRecord[], campaignId: string, txId: string) => {
  const record = records.find((candidate) => candidate.id === txId);
  return record && isPurchase(record) && record.params.campaignId === campaignId ? record : null;
};

export function usePurchaseRecord(input: {
  campaignId: string;
  orderKey: string | null;
  mode: Mode;
  account: string | null;
}): { record: PurchaseRecord | null; view: RecordView } {
  const { campaignId, orderKey, mode, account } = input;
  const engine = useTxEngine();
  const record = useTxStore((state) => {
    if (!orderKey || !account) return null;
    const resumeKey = `purchase:${campaignId}:${orderKey}`;
    return (
      state.records
        .filter(isPurchase)
        .filter(
          (candidate) =>
            candidate.resumeKey === resumeKey &&
            candidate.mode === mode &&
            candidate.account.toLowerCase() === account.toLowerCase(),
        )
        .toSorted((a, b) => b.startedAt - a.startedAt)[0] ?? null
    );
  });
  const view = viewRecord(record);
  const latest = useRef<{ id: string | null; active: boolean }>({ id: null, active: false });
  const recordId = record?.id ?? null;
  const active = view.kind === "active" || view.kind === "confirming";
  useEffect(() => {
    latest.current = { id: recordId, active };
  }, [recordId, active]);

  useEffect(() => {
    visibleSurfaces.set(campaignId, (visibleSurfaces.get(campaignId) ?? 0) + 1);
    const closeInlineSheets = () => {
      const ui = useUiStore.getState();
      const records = useTxStore.getState().records;
      for (const modal of ui.modals) {
        if (modal.id !== "M-11" || !("txId" in modal.props)) continue;
        if (purchaseFor(records, campaignId, modal.props.txId)) ui.close(modal.key);
      }
    };
    closeInlineSheets();
    const unsubscribe = useUiStore.subscribe(closeInlineSheets);
    return () => {
      unsubscribe();
      visibleSurfaces.set(campaignId, (visibleSurfaces.get(campaignId) ?? 1) - 1);
      const current = latest.current;
      if (current.id && current.active) engine.hide(current.id);
    };
  }, [campaignId, engine]);

  return { record, view };
}
