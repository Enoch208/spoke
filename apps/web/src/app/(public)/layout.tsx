import type { ReactNode } from "react";
import { GlobalLayer } from "@/components/app/global-layer";
import { Providers } from "@/components/app/providers";
import { AppShell } from "@/components/app/shell/app-shell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
      <GlobalLayer />
    </Providers>
  );
}
