import { clientMethodSchemas, type ClientMethod } from "@spoke/protocol";
import { createDemoRuntime } from "../../src/demo/runtime/runtime";
import type { DemoSnapshot } from "../../src/demo/runtime/snapshot";
import type { Persona } from "../../src/demo/world/types";
import { createDemoChain, replayChainEntry } from "../../src/lib/client/demo/chain/chain";
import { buildDemoClient, createReplayer } from "../../src/lib/client/demo/client";
import { fail, type AllHandlers, type DemoHandler } from "../../src/lib/client/demo/handler";
import { demoReads, demoWrites } from "../../src/lib/client/demo/registry";

export const ANCHOR = Date.parse("2026-10-12T12:00:00.000Z");

const isMethod = (name: string): name is ClientMethod => Object.hasOwn(clientMethodSchemas, name);

const missing =
  <M extends ClientMethod>(method: M): DemoHandler<M> =>
  () =>
    fail("INTERNAL", `${method} has no demo handler yet.`);

const isAllHandlers = (value: Record<string, unknown>): value is AllHandlers =>
  Object.keys(clientMethodSchemas).every((method) => typeof value[method] === "function");

const implemented: Record<string, unknown> = { ...demoReads, ...demoWrites };

export const handlers = (): AllHandlers => {
  const filled: Record<string, unknown> = Object.fromEntries(
    Object.keys(clientMethodSchemas)
      .filter(isMethod)
      .map((method) => [method, implemented[method] ?? missing(method)]),
  );
  if (!isAllHandlers(filled)) throw new RangeError("Handler table is incomplete.");
  return filled;
};

export const implementedMethods = (): ClientMethod[] => Object.keys(implemented).filter(isMethod);

export const writeMethods = (): Set<ClientMethod> =>
  new Set(Object.keys(demoWrites).filter(isMethod));

export interface TestClientOptions {
  persona?: Persona;
  snapshot?: DemoSnapshot | null;
  onChange?: (snapshot: DemoSnapshot) => void;
}

export const createDemoTestClient = (options: TestClientOptions = {}) => {
  let clock = options.snapshot?.anchor ?? ANCHOR;
  const table = handlers();
  const replayClient = createReplayer(table);
  const runtime = createDemoRuntime(
    {
      clock: () => clock,
      persona: options.persona ?? "distributor",
      snapshot: options.snapshot ?? null,
      ...(options.onChange ? { onChange: options.onChange } : {}),
    },
    (entry, target) => {
      replayClient(entry, target);
      replayChainEntry(entry, target);
    },
  );
  const client = buildDemoClient(table, writeMethods(), runtime);
  return {
    client,
    runtime,
    chain: createDemoChain(runtime),
    advance: (ms: number) => {
      clock += ms;
    },
  };
};
