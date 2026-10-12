"use client";

import { useSessionStore } from "@/lib/stores/session";

export const sameAddress = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a) && Boolean(b) && a?.toLowerCase() === b?.toLowerCase();

export const useViewerAddress = () => useSessionStore((state) => state.address);
