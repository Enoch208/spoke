"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCheckoutStore } from "./checkout";
import { useDemoStore } from "./demo";
import { useModeStore } from "./mode";
import { useTxStore } from "./tx";
import { useUiStore } from "./ui";
import { useWorkspaceStore } from "./workspace";

const persistedStores = [
  useModeStore,
  useWorkspaceStore,
  useUiStore,
  useCheckoutStore,
  useDemoStore,
  useTxStore,
] as const;

type HydrationState = { hydrated: boolean; markHydrated: () => void };

const useHydrationStore = create<HydrationState>()((set) => ({
  hydrated: false,
  markHydrated: () => {
    set({ hydrated: true });
  },
}));

let started: Promise<void> | null = null;

export const rehydratePersistedStores = () => {
  started ??= Promise.all(
    persistedStores.map((store) => Promise.resolve(store.persist.rehydrate())),
  ).then(() => {
    useHydrationStore.getState().markHydrated();
  });
  return started;
};

export const useStoresHydrated = () => {
  const hydrated = useHydrationStore((state) => state.hydrated);
  useEffect(() => {
    void rehydratePersistedStores();
  }, []);
  return hydrated;
};
