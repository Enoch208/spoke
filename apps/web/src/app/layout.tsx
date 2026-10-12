import "@fontsource-variable/urbanist";
import "@fontsource-variable/jost";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { MotionRoot } from "@/components/motion/motion-root";
import { motionFlagScript } from "@/components/motion/motion-flag";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Spoke · The distribution graph",
  description:
    "Distribution is a network. Launch a product, let people share it through trusted communities, and pay only for real sales with transparent onchain rules.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionFlagScript }} />
      </head>
      <body>
        {children}
        <MotionRoot />
      </body>
    </html>
  );
}
