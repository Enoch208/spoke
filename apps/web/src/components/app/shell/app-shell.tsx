"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { shellCopy } from "@/lib/copy";
import { routes, withNext } from "@/lib/routes";
import { useModeStore } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { BannerStack } from "../banners";
import { CommandPalette } from "../command-palette";
import { SignedOutGate } from "./signed-out-gate";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { TopBar } from "./top-bar";
import { useShellArea } from "./use-area";

const contentId = "app-content";

const useSellWithoutBusinessRedirect = (area: string) => {
  const router = useRouter();
  const pathname = usePathname();
  const mode = useModeStore((state) => state.mode);
  const status = useSessionStore((state) => state.status);
  const isMerchant = useSessionStore((state) => state.isMerchant);
  useEffect(() => {
    if (area !== "sell" || mode !== "live" || status !== "signedIn" || isMerchant) return;
    router.replace(withNext(routes.sell.setup, pathname));
  }, [area, mode, status, isMerchant, pathname, router]);
};

export function AppShell({ children }: { children: ReactNode }) {
  const area = useShellArea();
  const mode = useModeStore((state) => state.mode);
  const status = useSessionStore((state) => state.status);
  const bootstrapped = useSessionStore((state) => state.bootstrapped);
  useSellWithoutBusinessRedirect(area);
  const gated = mode === "live" && bootstrapped && status !== "signedIn" && status !== "expired";
  return (
    <div className="bg-page flex min-h-dvh">
      <a
        href={`#${contentId}`}
        className="bg-ink text-page font-ui sr-only z-50 rounded-3xl px-4 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {shellCopy.skipToContent}
      </a>
      <Sidebar area={area} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar area={area} />
        <BannerStack surface="app" />
        <main
          id={contentId}
          tabIndex={-1}
          className="font-ui mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-12"
        >
          {gated ? <SignedOutGate /> : children}
        </main>
      </div>
      <TabBar area={area} />
      <CommandPalette />
    </div>
  );
}
