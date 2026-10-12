import { routes } from "../routes";
import type { Persona } from "../stores/mode";

export const personaHomes: Record<Persona, string> = {
  merchant: routes.sell.overview,
  distributor: routes.earn.home,
  buyer: routes.purchases,
};

const demoOnlyPrefixes = [routes.demo];

export const internalPath = (next: string | null | undefined): string | null => {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  const url = new URL(next, "https://usespoke.xyz");
  if (url.origin !== "https://usespoke.xyz") return null;
  return `${url.pathname}${url.search}${url.hash}`;
};

const isDemoPath = (path: string) =>
  path.split(/[/?#]/).some((segment) => segment.startsWith("demo-")) ||
  path.startsWith("/receipts/demo/") ||
  demoOnlyPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export const demoLanding = (persona: Persona, next: string | null | undefined): string => {
  const path = internalPath(next);
  return path && path !== routes.demo && path !== routes.demoExit ? path : personaHomes[persona];
};

export const liveEquivalent = (current: string | null | undefined): string | null => {
  const path = internalPath(current);
  return path && !isDemoPath(path) ? path : null;
};

export const exitTarget = (
  current: string | null | undefined,
  next: string | null | undefined,
): string => {
  const fromNext = internalPath(next);
  return (
    liveEquivalent(current) ?? (fromNext && !isDemoPath(fromNext) ? fromNext : null) ?? routes.home
  );
};

export const isPersona = (value: string | null | undefined): value is Persona =>
  value === "merchant" || value === "distributor" || value === "buyer";
