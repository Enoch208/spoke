"use client";

import { useEffect, useRef } from "react";
import { remainingAfterRun } from "./toaster-logic";

export const useToastTimer = ({
  durationMs,
  paused,
  version,
  onExpire,
}: {
  durationMs: number | null;
  paused: boolean;
  version: number;
  onExpire: () => void;
}) => {
  const remaining = useRef(durationMs ?? 0);
  const expire = useRef(onExpire);

  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    remaining.current = durationMs ?? 0;
  }, [durationMs, version]);

  useEffect(() => {
    if (durationMs === null || paused) return;
    const runningSince = performance.now();
    const timer = window.setTimeout(() => {
      expire.current();
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = remainingAfterRun(remaining.current, runningSince, performance.now());
    };
  }, [durationMs, paused, version]);
};
