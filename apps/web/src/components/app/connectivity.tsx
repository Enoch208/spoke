"use client";

import { useEffect } from "react";
import { useSignalsStore } from "@/lib/stores/signals";

export function ConnectivityWatcher({
  onOffline,
  onOnline,
}: {
  onOffline?: () => void;
  onOnline?: () => void;
}) {
  const setOnline = useSignalsStore((state) => state.setOnline);
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOffline = () => {
      setOnline(false);
      onOffline?.();
    };
    const goOnline = () => {
      setOnline(true);
      onOnline?.();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [setOnline, onOffline, onOnline]);
  return null;
}
