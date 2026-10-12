import { demoFlow } from "../../copy/flows/demo";
import { useDemoStore } from "../../stores/demo";
import { useModeStore } from "../../stores/mode";
import { useUiStore } from "../../stores/ui";
import { createSpokeClient, type SpokeClient } from "../types";
import type { DemoChain, DemoRuntime } from "./index";

export const DEMO_LATENCY_MS = 150;

export interface LoadedDemo {
  client: SpokeClient;
  runtime: DemoRuntime;
  chain: DemoChain;
  dispose: () => void;
}

export const loadDemoClient = async (): Promise<LoadedDemo> => {
  const [{ createDemoClient }, { readSnapshot }] = await Promise.all([
    import("./index"),
    import("../../../demo/runtime/snapshot"),
  ]);
  const stored: unknown = useDemoStore.getState().snapshot;
  const snapshot = readSnapshot(stored);
  const bundle = createDemoClient({
    snapshot,
    persona: useModeStore.getState().persona,
    latencyMs: DEMO_LATENCY_MS,
    onChange: (next) => {
      useDemoStore.getState().setSnapshot(next);
    },
  });
  const dispose = useModeStore.subscribe((state) => {
    if (state.persona !== bundle.runtime.persona()) bundle.runtime.setPersona(state.persona);
  });
  const lost = (stored !== null && snapshot === null) || bundle.runtime.restore() === "partial";
  if (lost)
    useUiStore
      .getState()
      .pushToast({ id: "T-12", tone: "info", message: demoFlow.reset, durationMs: 4000 });
  useDemoStore.getState().setSnapshot(bundle.runtime.snapshot());
  return {
    client: createSpokeClient("demo", bundle.client),
    runtime: bundle.runtime,
    chain: bundle.chain,
    dispose,
  };
};
