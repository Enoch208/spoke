"use client";

import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { dragOffset, shouldDismissSheet } from "./sheet-drag";

type DragState = { startY: number; startTime: number; lastY: number; lastTime: number };

export const useSheetDrag = ({
  surface,
  enabled,
  onDismiss,
}: {
  surface: RefObject<HTMLElement | null>;
  enabled: boolean;
  onDismiss: () => void;
}) => {
  const drag = useRef<DragState | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    drag.current = { startY: event.clientY, startTime: now, lastY: event.clientY, lastTime: now };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state) return;
    state.lastY = event.clientY;
    state.lastTime = performance.now();
    setOffset(dragOffset(event.clientY - state.startY));
  };

  const finish = () => {
    const state = drag.current;
    drag.current = null;
    setDragging(false);
    if (!state) return;
    const distance = state.lastY - state.startY;
    const elapsed = Math.max(1, state.lastTime - state.startTime);
    const height = surface.current?.getBoundingClientRect().height ?? window.innerHeight;
    if (shouldDismissSheet({ distance, height, velocity: distance / elapsed })) {
      onDismiss();
      return;
    }
    setOffset(0);
  };

  return {
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
    surfaceStyle: {
      translate: offset ? `0 ${String(offset)}px` : undefined,
      transition: dragging ? "none" : "translate 423ms var(--ease-spring)",
    },
  };
};
