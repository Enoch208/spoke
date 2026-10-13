"use client";

import { useSyncExternalStore } from "react";

const wideQuery = "(min-width: 1024px)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(wideQuery);
  media.addEventListener("change", onChange);
  return () => {
    media.removeEventListener("change", onChange);
  };
};

export const useWide = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(wideQuery).matches,
    () => false,
  );
