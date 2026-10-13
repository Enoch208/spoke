"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type WorldCounts = { merchants: number; distributors: number; sales: number };

type LoadState =
  { status: "loading" } | { status: "ready"; counts: WorldCounts } | { status: "failed" };

export function useWorldCounts() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  useEffect(() => {
    let current = true;
    Promise.all([import("@/demo/world/seed-world"), import("@/lib/client/demo")]).then(
      ([{ seedWorld }, { demoWorldCounts }]) => {
        if (current) setState({ status: "ready", counts: demoWorldCounts(seedWorld(Date.now())) });
      },
      () => {
        if (current) setState({ status: "failed" });
      },
    );
    return () => {
      current = false;
    };
  }, [attempt]);
  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((value) => value + 1);
    },
  };
}

const probeKey = "spoke-storage-probe";
let storageWorks: boolean | null = null;

const probeStorage = () => {
  if (storageWorks !== null) return storageWorks;
  try {
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
  return storageWorks;
};

const noSubscription = () => () => undefined;

export const useStorageWorks = () => useSyncExternalStore(noSubscription, probeStorage, () => true);
