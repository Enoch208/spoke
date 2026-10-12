"use client";

import { useEffect, useState } from "react";
import { useModeStore } from "./stores/mode";
import { loadDemoBundle } from "./demo/bundle";

export const useNow = () => {
  const mode = useModeStore((state) => state.mode);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let current = true;
    const update = () => {
      if (mode === "demo") {
        void loadDemoBundle().then((bundle) => {
          if (current) setNow(bundle.runtime.now());
        });
      } else setNow(Date.now());
    };
    update();
    const timer = setInterval(update, 1000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [mode]);
  return now;
};
