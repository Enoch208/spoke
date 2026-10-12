"use client";

import { useState } from "react";

export function useCursorPages() {
  const [cursors, setCursors] = useState<readonly (string | undefined)[]>([undefined]);
  const cursor = cursors.at(-1);
  return {
    cursor,
    page: cursors.length,
    hasPrevious: cursors.length > 1,
    next: (nextCursor: string | null | undefined) => {
      if (nextCursor) setCursors((previous) => [...previous, nextCursor]);
    },
    previous: () => {
      setCursors((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous));
    },
    reset: () => {
      setCursors([undefined]);
    },
  };
}
