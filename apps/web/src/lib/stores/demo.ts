import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Persona } from "./mode";
import { localJsonStorage } from "./storage";

export type QuickActionChoice = { choice: "allow" | "ask"; capMinor: string };

type DemoState = {
  snapshot: unknown;
  quickActions: Partial<Record<Persona, QuickActionChoice>>;
  setSnapshot: (snapshot: unknown) => void;
  setQuickActions: (persona: Persona, choice: QuickActionChoice) => void;
  reset: () => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      snapshot: null,
      quickActions: {},
      setSnapshot: (snapshot) => {
        set({ snapshot });
      },
      setQuickActions: (persona, choice) => {
        set((state) => ({ quickActions: { ...state.quickActions, [persona]: choice } }));
      },
      reset: () => {
        set({ snapshot: null, quickActions: {} });
      },
    }),
    {
      name: "spoke-demo",
      version: 2,
      storage: localJsonStorage,
      skipHydration: true,
      migrate: () => ({ snapshot: null, quickActions: {} }),
      partialize: ({ snapshot, quickActions }) => ({ snapshot, quickActions }),
    },
  ),
);
