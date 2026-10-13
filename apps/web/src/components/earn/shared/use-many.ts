"use client";

import type { ClientInput, ClientMethod, ClientOutput } from "@spoke/protocol";
import { useQueries } from "@tanstack/react-query";
import { ClientError } from "@/lib/client/errors";
import { useClientContext } from "@/lib/client/provider";
import { queryKey, staleTimeFor } from "@/lib/query/keys";

export function useManyQueries<M extends ClientMethod>(
  method: M,
  inputs: readonly ClientInput<M>[],
): readonly (ClientOutput<M> | undefined)[] {
  const context = useClientContext();
  const client = context.client;
  const results = useQueries({
    queries: inputs.map((input) => ({
      queryKey: queryKey(client?.mode ?? context.mode, method, input),
      queryFn: async (): Promise<ClientOutput<M>> => {
        if (!client)
          throw new ClientError({ method, code: "INTERNAL", message: "Client is not ready" });
        return client.call(method, input);
      },
      enabled: client !== null,
      staleTime: staleTimeFor(method),
    })),
  });
  return results.map((result) => result.data);
}
