"use client";

import { useState } from "react";
import { cx } from "@/components/ui/cx";
import { chartCopy } from "./copy";
import { chartColors, depthColors, maxOf, type Formatter } from "./scale";

export type HeatRow = { key: string; label: string; cells: readonly (bigint | null)[] };

const bandOf = (value: bigint, top: bigint) => {
  if (top <= 0n || value <= 0n) return -1;
  const band = Number((value * 5n + top - 1n) / top) - 1;
  return Math.min(4, Math.max(0, band));
};

export function Heatmap({
  rows,
  columns,
  format,
  label,
  cellLabel,
}: {
  rows: readonly HeatRow[];
  columns: readonly string[];
  format: Formatter;
  label: string;
  cellLabel: (row: HeatRow, column: string, value: string) => string;
}) {
  const [readout, setReadout] = useState<string | null>(null);
  const top = maxOf(rows.flatMap((row) => row.cells.map((cell) => cell ?? 0n)));
  const edges = depthColors.map((_, index) => (top * BigInt(index + 1)) / 5n);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table
          aria-label={label}
          className="font-ui w-full min-w-[560px] border-separate border-spacing-[2px] text-xs"
        >
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                {label}
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="text-subtle h-6 px-1 text-center font-medium"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="text-subtle h-8 pr-2 text-left font-medium whitespace-nowrap"
                >
                  {row.label}
                </th>
                {columns.map((column, index) => {
                  const value = row.cells[index];
                  if (value === undefined || value === null)
                    return <td key={column} aria-hidden="true" />;
                  const band = bandOf(value, top);
                  const text = band < 0 ? chartCopy.noData : format(value);
                  const description = cellLabel(row, column, band < 0 ? format(0n) : text);
                  return (
                    <td
                      key={column}
                      tabIndex={0}
                      aria-label={description}
                      onPointerEnter={() => {
                        setReadout(description);
                      }}
                      onFocus={() => {
                        setReadout(description);
                      }}
                      className={cx(
                        "focus-visible:ring-ink/30 h-8 min-w-9 rounded-[4px] text-center font-mono tabular-nums outline-none focus-visible:ring-2",
                        band < 0
                          ? "bg-pill text-faint"
                          : chartColors[depthColors[band] ?? "depth1"].bg,
                        band >= 3 ? "text-page" : band >= 0 ? "text-ink" : undefined,
                      )}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-subtle min-h-5 text-sm" aria-live="polite">
          {readout ?? ""}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-subtle">{chartCopy.fewer}</span>
          {depthColors.map((color, index) => (
            <span key={color} className="flex flex-col items-center gap-0.5">
              <span
                aria-hidden="true"
                className={cx("h-3 w-6 rounded-[3px]", chartColors[color].bg)}
              />
              <span className="text-faint font-mono text-[10px] tabular-nums">
                {format(edges[index] ?? 0n)}
              </span>
            </span>
          ))}
          <span className="text-subtle">{chartCopy.more}</span>
        </div>
      </div>
    </div>
  );
}
