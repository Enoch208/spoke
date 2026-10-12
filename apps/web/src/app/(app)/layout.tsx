import { headers } from "next/headers";
import type { ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { GlobalLayer } from "@/components/app/global-layer";
import { Providers } from "@/components/app/providers";
import { wagmiConfig } from "@/lib/wagmi";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"));
  return (
    <Providers initialState={initialState}>
      {children}
      <GlobalLayer />
    </Providers>
  );
}
