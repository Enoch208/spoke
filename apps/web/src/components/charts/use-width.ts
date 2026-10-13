"use client";

import { useEffect, useRef, useState } from "react";

export function useWidth<Element extends HTMLElement>(fallback = 640) {
  const ref = useRef<Element>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      setWidth(Math.max(200, Math.floor(node.getBoundingClientRect().width)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { ref, width };
}
