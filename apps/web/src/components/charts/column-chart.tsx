"use client";

import { useState, type KeyboardEvent } from "react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { AxisLabels, bandAt, plotBox, YGrid } from "./axes";
import { chartCopy } from "./copy";
import { TooltipBox } from "./legend";
import { chartColors, maxOf, niceTicks, ratio, type ChartColor, type Formatter } from "./scale";
import { useWidth } from "./use-width";

export type ColumnStack = {
  key: string;
  label: string;
  color: ChartColor;
  values: readonly bigint[];
};

const roundedTop = (x: number, y: number, w: number, h: number) => {
  const r = Math.max(0, Math.min(4, h, w / 2));
  return `M${String(x)},${String(y + h)} L${String(x)},${String(y + r)} Q${String(x)},${String(y)} ${String(x + r)},${String(y)} L${String(x + w - r)},${String(y)} Q${String(x + w)},${String(y)} ${String(x + w)},${String(y + r)} L${String(x + w)},${String(y + h)} Z`;
};

export function ColumnChart({
  title,
  labels,
  stacks,
  format,
  hidden,
  height = 240,
  capLabel = true,
}: {
  title: string;
  labels: readonly string[];
  stacks: readonly ColumnStack[];
  format: Formatter;
  hidden?: ReadonlySet<string>;
  height?: number;
  capLabel?: boolean;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const shown = stacks.filter((stack) => !hidden?.has(stack.key));
  const totals = labels.map((_, index) =>
    shown.reduce((total, stack) => total + (stack.values[index] ?? 0n), 0n),
  );
  const peak = maxOf(totals);
  const ticks = niceTicks(peak);
  const top = ticks.at(-1) ?? 1n;
  const box = plotBox(width, height, ticks.map(format), false);
  const count = labels.length;
  const tallest = totals.findIndex((total) => total === peak && total > 0n);
  const heightOf = (value: bigint) => ratio(value, top) * box.height;
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const start = active ?? count - 1;
    setActive(Math.min(count - 1, Math.max(0, start + (event.key === "ArrowRight" ? 1 : -1))));
  };
  const rows =
    active === null
      ? []
      : shown.map((stack) => ({
          key: stack.key,
          label: stack.label,
          value: format(stack.values[active] ?? 0n),
          color: stack.color,
        }));
  return (
    <div
      ref={ref}
      tabIndex={0}
      aria-label={fill(chartCopy.plot, { title })}
      onKeyDown={keys}
      onFocus={() => {
        setActive((current) => current ?? count - 1);
      }}
      onBlur={() => {
        setActive(null);
      }}
      className="focus-visible:ring-ink/20 relative rounded-lg outline-none focus-visible:ring-2"
    >
      <svg width={width} height={height} role="presentation" className="block overflow-visible">
        <YGrid ticks={ticks} top={top} box={box} format={format} />
        <AxisLabels labels={labels} box={box} banded />
        {labels.map((label, index) => {
          const { center, band } = bandAt(index, count, box.width);
          const barWidth = Math.max(2, Math.min(24, band * 0.6));
          const x = box.left + center - barWidth / 2;
          let base = box.top + box.height;
          const drawn = shown.filter((stack) => (stack.values[index] ?? 0n) > 0n);
          return (
            <g key={`${label}-${String(index)}`}>
              {drawn.map((stack, position) => {
                const full = heightOf(stack.values[index] ?? 0n);
                const gap = position > 0 ? 2 : 0;
                const segment = Math.max(0, full - gap);
                const y = base - full;
                base = y;
                const last = position === drawn.length - 1;
                return last ? (
                  <path
                    key={stack.key}
                    d={roundedTop(x, y, barWidth, segment)}
                    className={cx(chartColors[stack.color].fill, active === index && "opacity-80")}
                  />
                ) : (
                  <rect
                    key={stack.key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={segment}
                    className={cx(chartColors[stack.color].fill, active === index && "opacity-80")}
                  />
                );
              })}
              {capLabel && index === tallest ? (
                <text
                  x={box.left + center}
                  y={base - 6}
                  textAnchor="middle"
                  className="fill-ink font-mono text-[11px] tabular-nums"
                >
                  {format(totals[index] ?? 0n)}
                </text>
              ) : null}
              <rect
                x={box.left + center - Math.max(12, band / 2)}
                y={box.top}
                width={Math.max(24, band)}
                height={box.height}
                fill="transparent"
                onPointerEnter={() => {
                  setActive(index);
                }}
                onPointerDown={() => {
                  setActive(index);
                }}
                onPointerLeave={() => {
                  setActive(null);
                }}
              />
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <TooltipBox
          left={box.left + bandAt(active, count, box.width).center}
          top={4}
          width={width}
          title={labels[active] ?? ""}
          rows={rows}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {active !== null
          ? `${labels[active] ?? ""}: ${rows.map((row) => `${row.label} ${row.value}`).join(", ")}`
          : ""}
      </p>
    </div>
  );
}
