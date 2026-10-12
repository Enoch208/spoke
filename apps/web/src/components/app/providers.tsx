"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { retryDelay, shouldRetry } from "@/lib/client/errors";
import { ClientProvider } from "@/lib/client/provider";
import { staleTimes } from "@/lib/query/keys";
import { wagmiConfig } from "@/lib/wagmi";
import { loadDemoBundle } from "@/lib/demo/bundle";
import { SessionBootstrap } from "./session-bootstrap";
import { TxEngineProvider } from "./tx/tx-provider";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleTimes.list,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State | undefined;
}) {
  const [queryClient] = useState(createQueryClient);
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <ClientProvider loadDemoClient={async () => (await loadDemoBundle()).client}>
          <SessionBootstrap />
          <TxEngineProvider>{children}</TxEngineProvider>
        </ClientProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
