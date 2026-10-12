import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnyTxRecord, TxStep } from "@/lib/tx/types";
import { localJsonStorage } from "./storage";

const keepTerminalMs = 7 * 24 * 60 * 60 * 1000;
const maxRecords = 60;

type TxStoreState = {
  records: AnyTxRecord[];
  upsert: (record: AnyTxRecord) => void;
  patchRecord: (id: string, patch: Partial<Omit<AnyTxRecord, "id" | "kind" | "params">>) => void;
  patchStep: (id: string, stepId: string, patch: Partial<TxStep>) => void;
  setContext: (id: string, key: string, value: string) => void;
  remove: (id: string) => void;
  prune: (now: number) => void;
};

const touch = <T extends AnyTxRecord>(record: T, patch: Partial<T>): T => ({
  ...record,
  ...patch,
  updatedAt: Date.now(),
});

export const useTxStore = create<TxStoreState>()(
  persist(
    (set) => ({
      records: [],
      upsert: (record) => {
        set((state) => ({
          records: [record, ...state.records.filter((item) => item.id !== record.id)].slice(
            0,
            maxRecords,
          ),
        }));
      },
      patchRecord: (id, patch) => {
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id ? { ...record, ...patch, updatedAt: Date.now() } : record,
          ),
        }));
      },
      patchStep: (id, stepId, patch) => {
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id
              ? touch(record, {
                  steps: record.steps.map((step) =>
                    step.id === stepId ? { ...step, ...patch } : step,
                  ),
                })
              : record,
          ),
        }));
      },
      setContext: (id, key, value) => {
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id
              ? touch(record, { context: { ...record.context, [key]: value } })
              : record,
          ),
        }));
      },
      remove: (id) => {
        set((state) => ({ records: state.records.filter((record) => record.id !== id) }));
      },
      prune: (now) => {
        set((state) => ({
          records: state.records.filter((record) => now - record.updatedAt < keepTerminalMs),
        }));
      },
    }),
    {
      name: "spoke-tx",
      version: 1,
      storage: localJsonStorage,
      skipHydration: true,
      partialize: ({ records }) => ({ records }),
    },
  ),
);
