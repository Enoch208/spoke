import type { Persona } from "../world/types";
import type { DemoWorld } from "../world/world";
import { seedWorld } from "../world/seed-world";
import { freshSnapshot, type DemoSnapshot, type JournalEntry } from "./snapshot";

export const SYNCING_WINDOW_MS = 15_000;

export interface DemoRuntime {
  readonly world: DemoWorld;
  now: () => number;
  persona: () => Persona;
  personaId: () => DemoWorld["personas"][Persona];
  setPersona: (persona: Persona) => void;
  skipAhead: (ms: number) => void;
  record: (entry: Omit<JournalEntry, "at" | "persona">) => void;
  replaying: () => boolean;
  snapshot: () => DemoSnapshot;
  indexingStatus: () => "live" | "syncing";
  nextId: (kind: string) => number;
  restore: () => RestoreOutcome;
}

export type RestoreOutcome = "fresh" | "restored" | "partial";

export interface RuntimeOptions {
  snapshot?: DemoSnapshot | null;
  persona?: Persona;
  clock?: () => number;
  onChange?: (snapshot: DemoSnapshot) => void;
}

export type Replayer = (entry: JournalEntry, runtime: DemoRuntime) => void;

export const createDemoRuntime = (options: RuntimeOptions, replay: Replayer): DemoRuntime => {
  const clock = options.clock ?? (() => Date.now());
  const base = options.snapshot ?? freshSnapshot(clock(), options.persona ?? "distributor");
  const state: DemoSnapshot = { ...base, persona: options.persona ?? base.persona, journal: [] };
  const world = seedWorld(state.anchor);
  let pinned: number | null = null;
  let replayPersona: Persona | null = null;
  let restoreOutcome: RestoreOutcome = "fresh";

  const emit = () => options.onChange?.(runtime.snapshot());

  const runtime: DemoRuntime = {
    world,
    now: () => pinned ?? clock() + state.clockOffsetMs,
    persona: () => replayPersona ?? state.persona,
    personaId: () => world.personas[runtime.persona()],
    setPersona: (persona) => {
      state.persona = persona;
      emit();
    },
    skipAhead: (ms) => {
      state.clockOffsetMs += Math.max(0, Math.round(ms));
      emit();
    },
    record: (entry) => {
      if (pinned !== null) return;
      state.journal.push({ ...entry, at: runtime.now(), persona: runtime.persona() });
      emit();
    },
    replaying: () => pinned !== null,
    snapshot: () => ({ ...state, journal: [...state.journal] }),
    indexingStatus: () =>
      world.lastChainActionAt !== null &&
      runtime.now() - world.lastChainActionAt < SYNCING_WINDOW_MS
        ? "syncing"
        : "live",
    nextId: (kind) => {
      const next = (world.counters[kind] ?? 0) + 1;
      world.counters[kind] = next;
      return next;
    },
    restore: () => restoreOutcome,
  };

  const replayAll = (): RestoreOutcome => {
    for (const entry of base.journal) {
      pinned = entry.at;
      replayPersona = entry.persona;
      try {
        replay(entry, runtime);
      } catch (error) {
        if (error instanceof Error) return "partial";
        throw error;
      }
      state.journal.push(entry);
    }
    return base.journal.length ? "restored" : "fresh";
  };
  restoreOutcome = replayAll();
  pinned = null;
  replayPersona = null;
  return runtime;
};
