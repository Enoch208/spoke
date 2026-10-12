import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Persona } from "./mode";
import { localJsonStorage } from "./storage";

export type QuickActionChoice = { choice: "allow" | "ask"; capMinor: string };

type DemoState = {
  revision: number;
  clockOffsetSeconds: number;
  quickActions: Partial<Record<Persona, QuickActionChoice>>;
  advanceClock: (seconds: number) => void;
  setQuickActions: (persona: Persona, choice: QuickActionChoice) => void;
  reset: () => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      revision: 0,
      clockOffsetSeconds: 0,
      quickActions: {},
      advanceClock: (seconds) => {
        set((state) => ({ clockOffsetSeconds: state.clockOffsetSeconds + Math.max(0, seconds) }));
      },
      setQuickActions: (persona, choice) => {
        set((state) => ({ quickActions: { ...state.quickActions, [persona]: choice } }));
      },
      reset: () => {
        set((state) => ({ revision: state.revision + 1, clockOffsetSeconds: 0, quickActions: {} }));
      },
    }),
    {
      name: "spoke-demo",
      version: 1,
      storage: localJsonStorage,
      skipHydration: true,
      partialize: ({ revision, clockOffsetSeconds, quickActions }) => ({
        revision,
        clockOffsetSeconds,
        quickActions,
      }),
    },
  ),
);

export const demoNow = (clockOffsetSeconds: number, now = Date.now()) =>
  new Date(now + clockOffsetSeconds * 1000);
