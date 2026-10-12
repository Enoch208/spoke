"use client";

import { useState } from "react";

export function useCursorPages() {
  const [stack, setStack] = useState<readonly (string | undefined)[]>([undefined]);
  return {
    cursor: stack[stack.length - 1],
    page: stack.length,
    hasPrevious: stack.length > 1,
    next: (cursor: string) => {
      setStack((current) => [...current, cursor]);
    },
    previous: () => {
      setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
    },
    reset: () => {
      setStack([undefined]);
    },
  };
}
