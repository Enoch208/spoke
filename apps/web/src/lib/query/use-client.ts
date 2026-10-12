"use client";

import type { ClientInput, ClientMethod, ClientOutput } from "@spoke/protocol";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/lib/client/provider";
import { ClientError, isClientError } from "@/lib/client/errors";
import type { SpokeClient } from "@/lib/client/types";
import {
  keyForTarget,
  queryKey,
  refetchOnFocusFor,
  staleTimeFor,
  type InvalidationTarget,
} from "./keys";

export type ClientQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
  live?: boolean;
};

const asClientError = (method: ClientMethod, error: unknown) =>
  isClientError(error)
    ? error
    : new ClientError({
        method,
        code: "INTERNAL",
        message: error instanceof Error ? error.message : "Unexpected error",
      });

const notReady = (method: ClientMethod) =>
  new ClientError({ method, code: "INTERNAL", message: "Client is not ready" });

const run = async <M extends ClientMethod>(
  client: SpokeClient | null,
  method: M,
  input: ClientInput<M>,
): Promise<ClientOutput<M>> => {
  if (!client) throw notReady(method);
  try {
    return await client.call(method, input);
  } catch (error) {
    throw asClientError(method, error);
  }
};

export function useClientQuery<M extends ClientMethod>(
  method: M,
  input: ClientInput<M>,
  options: ClientQueryOptions = {},
) {
  const context = useClientContext();
  const client = options.live ? context.live : context.client;
  return useQuery<ClientOutput<M>, ClientError>({
    queryKey: queryKey(client?.mode ?? context.mode, method, input),
    queryFn: () => run(client, method, input),
    enabled: client !== null && (options.enabled ?? true),
    staleTime: options.staleTime ?? staleTimeFor(method),
    refetchOnWindowFocus: refetchOnFocusFor(method),
    refetchInterval: options.refetchInterval ?? false,
  });
}

export const useInvalidate = () => {
  const queryClient = useQueryClient();
  const { mode } = useClientContext();
  return (targets: readonly InvalidationTarget[]) =>
    Promise.all(
      targets.map((target) =>
        queryClient.invalidateQueries({ queryKey: keyForTarget(mode, target) }),
      ),
    );
};

export function useClientMutation<M extends ClientMethod>(
  method: M,
  invalidates: readonly InvalidationTarget[],
) {
  const { client } = useClientContext();
  const invalidate = useInvalidate();
  return useMutation<ClientOutput<M>, ClientError, ClientInput<M>>({
    mutationFn: (input) => run(client, method, input),
    onSuccess: () => invalidate(invalidates),
  });
}

export const queryHook = <M extends ClientMethod>(method: M) =>
  function useMethodQuery(input: ClientInput<M>, options?: ClientQueryOptions) {
    return useClientQuery(method, input, options);
  };

export const mutationHook = <M extends ClientMethod>(
  method: M,
  invalidates: readonly InvalidationTarget[],
) =>
  function useMethodMutation() {
    return useClientMutation(method, invalidates);
  };
