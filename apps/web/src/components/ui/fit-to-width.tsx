"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function FitToWidth({
  width,
  height,
  className,
  children,
}: {
  width: number;
  height: number;
  className?: string;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [width]);

  return (
    <div
      ref={frame}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ aspectRatio: `${String(width)} / ${String(height)}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width, height, transform: `scale(${String(scale)})` }}
      >
        {children}
      </div>
    </div>
  );
}
