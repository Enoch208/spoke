"use client";

import { useEffect, useState } from "react";
import {
  loadingPhase,
  nextLoadingChange,
  type LoadingPhase,
  type LoadingTiming,
} from "./loading-phase";

export const useLoadingPhase = (loading: boolean): LoadingPhase => {
  const [timing, setTiming] = useState<LoadingTiming>({
    startedAt: 0,
    loadedAt: loading ? null : 0,
  });
  const [now, setNow] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const at = performance.now();
      setTiming((current) =>
        loading
          ? { startedAt: at, loadedAt: null }
          : current.loadedAt === null
            ? { ...current, loadedAt: at }
            : current,
      );
      setNow(at);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [loading]);

  useEffect(() => {
    const next = nextLoadingChange(timing, now);
    if (next === null) return;
    const timer = window.setTimeout(() => {
      setNow(performance.now());
    }, next - now);
    return () => {
      window.clearTimeout(timer);
    };
  }, [timing, now]);

  return loadingPhase(timing, now);
};
