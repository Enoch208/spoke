"use client";

import { useRef, useState, type PointerEvent } from "react";
import { shouldDismissSheet } from "@/components/ui/sheet-drag";

type Swipe = { startX: number; startTime: number; width: number };

export const useSwipeDismiss = (onDismiss: () => void) => {
  const swipe = useRef<Swipe | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    swipe.current = {
      startX: event.clientX,
      startTime: performance.now(),
      width: event.currentTarget.getBoundingClientRect().width,
    };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (swipe.current) setOffset(event.clientX - swipe.current.startX);
  };

  const finish = (event: PointerEvent<HTMLElement>) => {
    const state = swipe.current;
    swipe.current = null;
    setDragging(false);
    if (!state) return;
    const distance = Math.abs(event.clientX - state.startX);
    const elapsed = Math.max(1, performance.now() - state.startTime);
    if (shouldDismissSheet({ distance, height: state.width, velocity: distance / elapsed })) {
      onDismiss();
      return;
    }
    setOffset(0);
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish },
    style: {
      translate: offset ? `${String(offset)}px 0` : undefined,
      transition: dragging ? "none" : "translate 423ms var(--ease-spring)",
    },
  };
};
