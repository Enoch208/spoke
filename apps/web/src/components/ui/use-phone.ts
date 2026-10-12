"use client";

import { useSyncExternalStore } from "react";

const phoneQuery = "(max-width: 639px)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(phoneQuery);
  media.addEventListener("change", onChange);
  return () => {
    media.removeEventListener("change", onChange);
  };
};

export const usePhone = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(phoneQuery).matches,
    () => false,
  );
