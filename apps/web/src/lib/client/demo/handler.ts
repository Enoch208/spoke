import type { ClientMethod, ClientOutput, clientMethodSchemas } from "@spoke/protocol";
import type { z } from "zod";
import type { DemoRuntime } from "../../../demo/runtime/runtime";
import { ClientError, type ClientErrorCode } from "../errors";

export type DemoInput<M extends ClientMethod> = z.output<(typeof clientMethodSchemas)[M]["input"]>;

export type DemoHandler<M extends ClientMethod> = (
  input: DemoInput<M>,
  runtime: DemoRuntime,
) => ClientOutput<M> | Promise<ClientOutput<M>>;

export type DomainMethods<D extends string> = Extract<ClientMethod, `${D}.${string}`>;

export type DomainHandlers<D extends string> = { [M in DomainMethods<D>]: DemoHandler<M> };

export type PartialHandlers<D extends string> = Partial<DomainHandlers<D>>;

export type AllHandlers = { [M in ClientMethod]: DemoHandler<M> };

export const fail = (
  code: ClientErrorCode,
  message: string,
  details?: Record<string, unknown>,
): never => {
  throw new ClientError({
    code,
    message,
    details: details ?? null,
    requestId: "demo",
    status: null,
  });
};

export const found = <T>(value: T | undefined | null, what: string): T => {
  if (value === undefined || value === null)
    return fail("NOT_FOUND", `${what} isn't in the sample world.`);
  return value;
};
