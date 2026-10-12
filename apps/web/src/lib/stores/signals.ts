import { create } from "zustand";

export type IndexingSignal = "live" | "syncing" | "behind";

type SignalsState = {
  indexingStatus: IndexingSignal | null;
  indexedBlock: string | null;
  apiFailures: number;
  rpcFailures: number;
  online: boolean;
  recordApiSuccess: (indexing: IndexingSignal | null, block: string | null) => void;
  recordApiFailure: () => void;
  recordRpcSuccess: () => void;
  recordRpcFailure: () => void;
  setOnline: (online: boolean) => void;
};

export const useSignalsStore = create<SignalsState>()((set) => ({
  indexingStatus: null,
  indexedBlock: null,
  apiFailures: 0,
  rpcFailures: 0,
  online: true,
  recordApiSuccess: (indexing, block) => {
    set((state) => ({
      apiFailures: 0,
      indexingStatus: indexing ?? state.indexingStatus,
      indexedBlock: block ?? state.indexedBlock,
    }));
  },
  recordApiFailure: () => {
    set((state) => ({ apiFailures: state.apiFailures + 1 }));
  },
  recordRpcSuccess: () => {
    set({ rpcFailures: 0 });
  },
  recordRpcFailure: () => {
    set((state) => ({ rpcFailures: state.rpcFailures + 1 }));
  },
  setOnline: (online) => {
    set({ online });
  },
}));

export const unreachableAfterFailures = 2;
