import type { ClientContract, ClientMethod } from "@spoke/protocol";
import { clientMethodSchemas } from "@spoke/protocol";
import {
  createDemoRuntime,
  type DemoRuntime,
  type RuntimeOptions,
} from "../../../demo/runtime/runtime";
import type { DemoWorld } from "../../../demo/world/world";
import { createDemoChain, replayChainEntry, type DemoChain } from "./chain/chain";
import { buildDemoClient, createReplayer, type DemoClientOptions } from "./client";
import type { AllHandlers } from "./handler";
import { demoReads, demoWrites } from "./registry";

export type { DemoRuntime, RestoreOutcome } from "../../../demo/runtime/runtime";
export type { DemoSnapshot } from "../../../demo/runtime/snapshot";
export type { DemoChain } from "./chain/chain";
export type { ChainActionInput, ChainActionName, DemoTxResult } from "./chain/actions";

export interface DemoClientBundle {
  client: ClientContract;
  runtime: DemoRuntime;
  chain: DemoChain;
}

const handlers = { ...demoReads, ...demoWrites } satisfies AllHandlers;

const isMethod = (name: string): name is ClientMethod => Object.hasOwn(clientMethodSchemas, name);

export const createDemoClient = (
  options: RuntimeOptions & DemoClientOptions = {},
): DemoClientBundle => {
  const replayClient = createReplayer(handlers);
  const runtime = createDemoRuntime(options, (entry, target) => {
    replayClient(entry, target);
    replayChainEntry(entry, target);
  });
  const writes = new Set(Object.keys(demoWrites).filter(isMethod));
  return {
    client: buildDemoClient(handlers, writes, runtime, options),
    runtime,
    chain: createDemoChain(runtime),
  };
};

export const demoWorldCounts = (world: DemoWorld) => ({
  merchants: world.merchants.length,
  distributors: world.people.filter((person) => person.isDistributor).length,
  sales: world.sales.length,
});
