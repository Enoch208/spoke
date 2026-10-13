"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUiStore } from "@/lib/stores/ui";

let guard: ((go: () => void) => void) | null = null;

export const requestLeave = (go: () => void) => {
  if (guard) guard(go);
  else go();
};

const anchorOf = (target: EventTarget | null) =>
  target instanceof Element ? target.closest("a[href]") : null;

export function useLeaveGuard(dirty: boolean, subject: string) {
  const router = useRouter();
  useEffect(() => {
    if (!dirty) return;
    const confirmLeave = (go: () => void) => {
      useUiStore.getState().open("M-43", { subject, onContinue: go });
    };
    guard = confirmLeave;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = anchorOf(event.target);
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      event.preventDefault();
      event.stopPropagation();
      confirmLeave(() => {
        router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      if (guard === confirmLeave) guard = null;
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [dirty, subject, router]);
}
