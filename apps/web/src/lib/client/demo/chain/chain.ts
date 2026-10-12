import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import type { JournalEntry } from "../../../../demo/runtime/snapshot";
import { z } from "zod";
import { fail } from "../handler";
import {
  chainActionSchemas,
  isChainAction,
  type ChainActionArgs,
  type ChainActionInput,
  type ChainActionName,
  type DemoTxResult,
} from "./actions";
import * as campaignActions from "./campaign-actions";
import * as saleActions from "./sale-actions";

type Executors = {
  [A in ChainActionName]: (runtime: DemoRuntime, args: ChainActionArgs<A>) => DemoTxResult;
};
type Schemas = { [A in ChainActionName]: z.ZodType<ChainActionArgs<A>> };

const executors: Executors = { ...campaignActions, ...saleActions };
const schemas: Schemas = chainActionSchemas;

const run = <A extends ChainActionName>(
  runtime: DemoRuntime,
  action: A,
  input: unknown,
): { args: ChainActionArgs<A>; result: DemoTxResult } => {
  const parsed = schemas[action].safeParse(input);
  const args = parsed.success
    ? parsed.data
    : fail("VALIDATION_FAILED", z.prettifyError(parsed.error));
  const execute: Executors[A] = executors[action];
  return { args, result: execute(runtime, args) };
};

export interface DemoChain {
  execute: <A extends ChainActionName>(action: A, input: ChainActionInput<A>) => DemoTxResult;
}

export const createDemoChain = (runtime: DemoRuntime): DemoChain => ({
  execute: (action, input) => {
    const { args, result } = run(runtime, action, input);
    const recorded = z.json().safeParse(args);
    if (recorded.success) runtime.record({ kind: "chain", name: action, input: recorded.data });
    return result;
  },
});

export const replayChainEntry = (entry: JournalEntry, runtime: DemoRuntime) => {
  if (entry.kind === "chain" && isChainAction(entry.name)) run(runtime, entry.name, entry.input);
};
