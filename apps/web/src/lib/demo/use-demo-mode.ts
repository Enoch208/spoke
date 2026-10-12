"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { toasts } from "../copy/toasts";
import { useModeStore, type Persona } from "../stores/mode";
import { useUiStore } from "../stores/ui";
import { demoLanding, exitTarget } from "./landing";
import { useSessionStore } from "../stores/session";
import { endPasskeySession } from "../accounts/passkey";

export interface EnterDemoInput {
  persona: Persona;
  next?: string | null;
}

export interface ExitDemoInput {
  next?: string | null;
}

export const useDemoMode = () => {
  const router = useRouter();
  const pathname = usePathname();

  const enterDemo = useCallback(
    ({ persona, next }: EnterDemoInput) => {
      endPasskeySession();
      useSessionStore.getState().signOut();
      useModeStore.getState().setMode("demo", persona);
      router.push(demoLanding(persona, next));
      useUiStore.getState().pushToast({
        id: "T-11",
        tone: "info",
        message: toasts["T-11"].copy.demo,
        durationMs: toasts["T-11"].duration,
      });
    },
    [router],
  );

  const exitDemo = useCallback(
    ({ next }: ExitDemoInput = {}) => {
      endPasskeySession();
      useSessionStore.getState().signOut();
      useModeStore.getState().setMode("live");
      router.push(exitTarget(pathname, next));
      useUiStore.getState().pushToast({
        id: "T-11",
        tone: "info",
        message: toasts["T-11"].copy.live,
        durationMs: toasts["T-11"].duration,
      });
    },
    [router, pathname],
  );

  return { enterDemo, exitDemo };
};
