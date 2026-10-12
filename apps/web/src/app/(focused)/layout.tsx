import type { ReactNode } from "react";
import { GlobalLayer } from "@/components/app/global-layer";
import { Providers } from "@/components/app/providers";

export default function FocusedLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      {children}
      <GlobalLayer />
    </Providers>
  );
}
