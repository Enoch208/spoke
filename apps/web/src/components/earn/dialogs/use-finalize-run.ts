"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { overallStatus } from "@/lib/tx/records";
import { useTxStore } from "@/lib/stores/tx";
import type { AnyTxRecord } from "@/lib/tx/types";
import { closeSheetFor, useStartTx } from "../shared/use-start";

export type FinalizeRun = {
  index: number;
  txIds: readonly (string | null)[];
  status: "idle" | "running" | "stopped" | "done";
};

const finished = new Set(["done", "already_done", "syncing"]);
const halted = new Set(["rejected", "failed", "replaced", "expired", "unknown"]);

export function useFinalizeRun(saleIds: readonly string[]) {
  const start = useStartTx();
  const handled = useRef(new Set<string>());
  const [run, setRun] = useState<FinalizeRun>({ index: 0, txIds: [], status: "idle" });

  const launch = (index: number, txIds: readonly (string | null)[]) => {
    const saleId = saleIds[index];
    if (saleId === undefined) {
      setRun({ index, txIds, status: "done" });
      return;
    }
    const txId = start("finalize", { saleId });
    setRun({
      index,
      txIds: [...txIds.slice(0, index), txId],
      status: txId ? "running" : "stopped",
    });
  };

  const observe = useEffectEvent((records: readonly AnyTxRecord[]) => {
    const txId = run.status === "running" ? run.txIds[run.index] : null;
    if (!txId || handled.current.has(txId)) return;
    const record = records.find((candidate) => candidate.id === txId);
    if (!record) return;
    const status = overallStatus(record);
    if (finished.has(status)) {
      handled.current.add(txId);
      closeSheetFor(txId);
      launch(run.index + 1, run.txIds);
    } else if (halted.has(status)) {
      handled.current.add(txId);
      setRun((previous) => ({ ...previous, status: "stopped" }));
    }
  });

  useEffect(
    () =>
      useTxStore.subscribe((state) => {
        observe(state.records);
      }),
    [],
  );

  return {
    run,
    begin: () => {
      launch(0, []);
    },
    resume: () => {
      launch(run.index, run.txIds);
    },
  };
}
