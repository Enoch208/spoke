"use client";

import { useEffect, useEffectEvent } from "react";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus } from "@/lib/tx/records";
import type { AnyTxRecord } from "@/lib/tx/types";

const finished = new Set(["done", "already_done"]);

export function useTxOutcome(txId: string | null, onFinish: (record: AnyTxRecord) => void) {
  const observe = useEffectEvent((records: readonly AnyTxRecord[]) => {
    const record = records.find((candidate) => candidate.id === txId);
    if (record && finished.has(overallStatus(record))) onFinish(record);
  });
  useEffect(() => {
    if (!txId) return;
    return useTxStore.subscribe((state) => {
      observe(state.records);
    });
  }, [txId]);
}

export function useTxStatus(txId: string | null) {
  return useTxStore((state) => {
    const record = state.records.find((candidate) => candidate.id === txId);
    return record ? overallStatus(record) : null;
  });
}
