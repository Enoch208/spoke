import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJsonStorage } from "./storage";

export const modes = ["live", "demo"] as const;
export type Mode = (typeof modes)[number];

export const personas = ["merchant", "distributor", "buyer"] as const;
export type Persona = (typeof personas)[number];

type ModeState = {
  mode: Mode;
  persona: Persona;
  setMode: (mode: Mode, persona?: Persona) => void;
  setPersona: (persona: Persona) => void;
};

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: "live",
      persona: "merchant",
      setMode: (mode, persona) => {
        set((state) => ({ mode, persona: persona ?? state.persona }));
      },
      setPersona: (persona) => {
        set({ persona });
      },
    }),
    {
      name: "spoke-mode",
      version: 1,
      storage: localJsonStorage,
      skipHydration: true,
      partialize: ({ mode, persona }) => ({ mode, persona }),
    },
  ),
);

export const selectMode = (state: ModeState) => state.mode;
export const selectIsDemo = (state: ModeState) => state.mode === "demo";
export const selectPersona = (state: ModeState) => state.persona;
