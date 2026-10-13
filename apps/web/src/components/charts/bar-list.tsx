"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { chartColors, maxOf, ratio, type ChartColor } from "./scale";

export type BarRow = {
  key: string;
  label: ReactNode;
  value: bigint;
  display: string;
  color: ChartColor;
  note?: ReactNode;
  between?: ReactNode;
};

export function BarList({
  rows,
  label,
  max,
}: {
  rows: readonly BarRow[];
  label: string;
  max?: bigint;
}) {
  const [active, setActive] = useState<string | null>(null);
  const top = max ?? maxOf(rows.map((row) => row.value));
  return (
    <ul aria-label={label} className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1.5">
          {row.between ? <div className="text-subtle pl-1 text-xs">{row.between}</div> : null}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-ink flex items-center gap-2 text-sm">{row.label}</span>
            {row.note ? <span className="text-subtle text-xs">{row.note}</span> : null}
          </div>
          <div
            tabIndex={0}
            aria-label={`${typeof row.label === "string" ? row.label : row.key}: ${row.display}`}
            onPointerEnter={() => {
              setActive(row.key);
            }}
            onPointerLeave={() => {
              setActive(null);
            }}
            onFocus={() => {
              setActive(row.key);
            }}
            onBlur={() => {
              setActive(null);
            }}
            className="focus-visible:ring-ink/20 flex min-h-6 items-center gap-3 rounded-md outline-none focus-visible:ring-2"
          >
            <div className="relative h-5 min-w-0 flex-1">
              <div
                className={cx(
                  "ease-spring h-5 rounded-r-[4px] transition-[width,opacity] duration-[423ms]",
                  chartColors[row.color].bg,
                  active !== null && active !== row.key && "opacity-60",
                )}
                style={{
                  width: `${String(Math.max(row.value > 0n ? 1 : 0, ratio(row.value, top) * 100))}%`,
                }}
              />
            </div>
            <span className="text-ink w-28 shrink-0 text-right font-mono text-sm tabular-nums sm:w-36">
              {row.display}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
