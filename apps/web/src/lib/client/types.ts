import type { ClientContract, ClientInput, ClientMethod, ClientOutput } from "@spoke/protocol";
import type { Mode } from "@/lib/stores/mode";

export type { ClientContract, ClientInput, ClientMethod, ClientOutput };

export type ClientImplementation = ClientContract;

export type ClientDomain = ClientMethod extends `${infer Domain}.${string}` ? Domain : never;

export type MethodsOf<D extends ClientDomain> = Extract<ClientMethod, `${D}.${string}`>;

export type SpokeClient = {
  readonly mode: Mode;
  readonly call: <M extends ClientMethod>(
    method: M,
    input: ClientInput<M>,
  ) => Promise<ClientOutput<M>>;
};

export type IndexingStatus = "live" | "syncing" | "behind";

export type ResponseMeta = {
  method: ClientMethod;
  requestId: string | null;
  indexingStatus: IndexingStatus | null;
  blockNumber: string | null;
};

export const splitMethod = (method: ClientMethod) => {
  const dot = method.indexOf(".");
  return { domain: method.slice(0, dot), verb: method.slice(dot + 1) };
};

export const createSpokeClient = (
  mode: Mode,
  implementation: ClientImplementation,
): SpokeClient => ({
  mode,
  call: (method, input) => implementation[method](input),
});
