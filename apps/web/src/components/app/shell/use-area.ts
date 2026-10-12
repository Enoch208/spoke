"use client";

import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { useModeStore } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { useWorkspaceStore, workspaceForPath } from "@/lib/stores/workspace";

export type ShellArea = "earn" | "sell" | "ops";

export type Viewer = "loading" | "signedOut" | "signedIn" | "demo";

const publicPrefixes: readonly string[] = [
  routes.explore,
  routes.distributors,
  routes.demo,
  routes.status,
  routes.support,
  "/c",
  "/r",
  "/receipts",
  "/u",
  "/m",
];

export const isPublicPath = (pathname: string) =>
  publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const areaForPath = (pathname: string, fallback: "earn" | "sell"): ShellArea => {
  if (pathname === routes.ops.queue || pathname.startsWith(`${routes.ops.queue}/`)) return "ops";
  return workspaceForPath(pathname) ?? fallback;
};

export const useShellArea = (): ShellArea => {
  const pathname = usePathname();
  const workspace = useWorkspaceStore((state) => state.workspace);
  return areaForPath(pathname, workspace);
};

export const useIsPublicPage = () => isPublicPath(usePathname());

export const useViewer = (): Viewer => {
  const mode = useModeStore((state) => state.mode);
  const status = useSessionStore((state) => state.status);
  const bootstrapped = useSessionStore((state) => state.bootstrapped);
  if (mode === "demo") return "demo";
  if (status === "signedIn" || status === "expired") return "signedIn";
  if (!bootstrapped) return "loading";
  return "signedOut";
};

const signedOutThingByPrefix: readonly [string, string][] = [
  [routes.earn.earnings, "earnings"],
  [routes.earn.payouts, "earnings"],
  [routes.earn.links, "links"],
  [routes.sell.sales, "sales"],
  [routes.purchases, "purchases"],
  [routes.sell.campaigns, "campaigns"],
  [routes.wallet, "wallet"],
  [routes.notifications, "notifications"],
  ["/settings", "settings"],
  [routes.sell.overview, "campaigns"],
];

export const signedOutThingFor = (pathname: string) =>
  signedOutThingByPrefix.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.[1] ?? "earnings";
