"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type View = { x: number; y: number; k: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const minK = 0.25;
const maxK = 2.5;
const clampK = (k: number) => Math.min(maxK, Math.max(minK, k));

export function usePanZoom() {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ x: 40, y: 200, k: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const zoomAt = (factor: number, cx: number, cy: number) => {
    setView((current) => {
      const k = clampK(current.k * factor);
      const ratio = k / current.k;
      return { k, x: cx - (cx - current.x) * ratio, y: cy - (cy - current.y) * ratio };
    });
  };

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
    };
  }, []);

  const size = () => {
    const rect = svg.current?.getBoundingClientRect();
    return { width: rect?.width ?? 800, height: rect?.height ?? 560 };
  };

  const fit = (bounds: Bounds, padding = 48, focus?: { x: number; y: number }, floor = minK) => {
    const { width, height } = size();
    const w = Math.max(1, bounds.maxX - bounds.minX);
    const h = Math.max(1, bounds.maxY - bounds.minY);
    const k = clampK(
      Math.max(
        floor,
        Math.min(1.1, Math.min((width - padding * 2) / w, (height - padding * 2) / h)),
      ),
    );
    const x = w * k <= width ? (width - w * k) / 2 - bounds.minX * k : padding - bounds.minX * k;
    const y =
      h * k <= height
        ? (height - h * k) / 2 - bounds.minY * k
        : height / 2 - (focus?.y ?? (bounds.minY + bounds.maxY) / 2) * k;
    setView({ k, x, y });
  };

  const zoomBy = (factor: number) => {
    const { width, height } = size();
    zoomAt(factor, width / 2, height / 2);
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.target instanceof Element && event.target.closest("[data-graph-item]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const all = [...pointers.current.values()];
    const [a, b] = all;
    if (all.length === 2 && a && b) {
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) {
        const rect = event.currentTarget.getBoundingClientRect();
        zoomAt(distance / pinch.current, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      }
      pinch.current = distance;
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const panTo = (x: number, y: number) => {
    const { width, height } = size();
    setView((current) => ({
      ...current,
      x: width / 2 - x * current.k,
      y: height / 2 - y * current.k,
    }));
  };

  return {
    svg,
    view,
    fit,
    zoomBy,
    panTo,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
