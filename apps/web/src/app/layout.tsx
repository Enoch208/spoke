import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Spoke",
  description: "Pay for revenue, not reach. Merchant-funded rewards for real sales, on Monad.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"));
  return (
    <html lang="en">
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
