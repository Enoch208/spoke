import "@fontsource-variable/urbanist";
import "@fontsource-variable/jost";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Spoke · The distribution graph",
  description:
    "Distribution is a network. Launch a product, let people share it through trusted communities, and pay only for real sales with transparent onchain rules.",
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
