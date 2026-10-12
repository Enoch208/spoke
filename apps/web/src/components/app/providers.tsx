"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { retryDelay, shouldRetry } from "@/lib/client/errors";
import { ClientProvider } from "@/lib/client/provider";
import { staleTimes } from "@/lib/query/keys";
import { wagmiConfig } from "@/lib/wagmi";

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
        <ClientProvider>{children}</ClientProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
