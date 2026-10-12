import {
  clientMethodSchemas,
  type ClientContract,
  type ClientInput,
  type ClientMethod,
  type ClientOutput,
} from "@spoke/protocol";
import { z } from "zod";
import type { DemoRuntime } from "../../../demo/runtime/runtime";
import type { JournalEntry } from "../../../demo/runtime/snapshot";
import { fail, type AllHandlers, type DemoInput } from "./handler";

type InputSchemas = { [M in ClientMethod]: { input: z.ZodType<DemoInput<M>> } };
type Call<M extends ClientMethod> = (input: ClientInput<M>) => Promise<ClientOutput<M>>;
type Calls = { [M in ClientMethod]: Call<M> };

const inputSchemas: InputSchemas = clientMethodSchemas;

const isMethod = (name: string): name is ClientMethod => Object.hasOwn(clientMethodSchemas, name);

const parseInput = <M extends ClientMethod>(method: M, input: unknown): DemoInput<M> => {
  const schema = inputSchemas[method].input;
  const parsed = schema.safeParse(input);
  return parsed.success ? parsed.data : fail("VALIDATION_FAILED", z.prettifyError(parsed.error));
};

const journalable = (input: unknown): z.core.util.JSONType | null => {
  const parsed = z.json().safeParse(input);
  return parsed.success ? parsed.data : null;
};

export interface DemoClientOptions {
  latencyMs?: number;
}

export const createReplayer =
  (handlers: AllHandlers) =>
  (entry: JournalEntry, runtime: DemoRuntime): void => {
    if (entry.kind !== "client" || !isMethod(entry.name)) return;
    void invoke(handlers, entry.name, entry.input, runtime);
  };

const invoke = <M extends ClientMethod>(
  handlers: AllHandlers,
  method: M,
  input: unknown,
  runtime: DemoRuntime,
) => {
  const handler: AllHandlers[M] = handlers[method];
  return handler(parseInput(method, input), runtime);
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const callFor = <M extends ClientMethod>(
  method: M,
  handlers: AllHandlers,
  writes: ReadonlySet<ClientMethod>,
  runtime: DemoRuntime,
  options: DemoClientOptions,
): Call<M> => {
  return async (input) => {
    if (options.latencyMs) await wait(options.latencyMs);
    const output = invoke(handlers, method, input, runtime);
    const recorded = writes.has(method) ? journalable(parseInput(method, input)) : null;
    if (recorded !== null) runtime.record({ kind: "client", name: method, input: recorded });
    return output;
  };
};

const isComplete = (client: Record<string, unknown>): client is Calls =>
  Object.keys(clientMethodSchemas).every((method) => typeof client[method] === "function");

export const buildDemoClient = (
  handlers: AllHandlers,
  writes: ReadonlySet<ClientMethod>,
  runtime: DemoRuntime,
  options: DemoClientOptions = {},
): ClientContract => {
  const methods = Object.keys(clientMethodSchemas).filter(isMethod);
  const client: Record<string, unknown> = Object.fromEntries(
    methods.map((method) => [method, callFor(method, handlers, writes, runtime, options)]),
  );
  if (!isComplete(client)) throw new RangeError("The demo client is missing a method.");
  return client;
};
