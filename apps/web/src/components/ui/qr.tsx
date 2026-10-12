"use client";

import { useMemo, type Ref } from "react";
import { cx } from "./cx";
import { qrGeometry } from "./qr-geometry";

export function Qr({
  value,
  label,
  size = 200,
  className,
  ref,
}: {
  value: string;
  label: string;
  size?: number;
  className?: string | undefined;
  ref?: Ref<SVGSVGElement>;
}) {
  const geometry = useMemo(() => qrGeometry(value), [value]);
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      viewBox={geometry.viewBox}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cx("rounded-xl", className)}
    >
      <rect width="100%" height="100%" className="fill-surface" />
      <path d={geometry.path} className="fill-ink" />
    </svg>
  );
}
