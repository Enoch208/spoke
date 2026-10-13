"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function useCloseOnNavigate(close: () => void) {
  const pathname = usePathname();
  const first = useRef(pathname);
  const latestClose = useRef(close);
  useEffect(() => {
    latestClose.current = close;
  }, [close]);
  useEffect(() => {
    if (pathname !== first.current) latestClose.current();
  }, [pathname]);
}
