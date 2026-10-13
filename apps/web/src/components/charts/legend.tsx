"use client";

import { cx } from "@/components/ui/cx";
import { chartColors, type ChartColor } from "./scale";

export type LegendItem = { key: string; label: string; color: ChartColor; shape?: "line" | "box" };

export function LegendKey({
  color,
  shape = "box",
}: {
  color: ChartColor;
  shape?: "line" | "box" | undefined;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-block shrink-0",
        chartColors[color].bg,
        shape === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-[3px]",
      )}
    />
  );
}

export function Legend({
  items,
  hidden,
  onToggle,
  label,
}: {
  items: readonly LegendItem[];
  hidden?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
  label: string;
}) {
  if (items.length < 2) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => {
        const off = hidden?.has(item.key) ?? false;
        const content = (
          <>
            <LegendKey color={item.color} shape={item.shape} />
            <span className={cx(off ? "text-faint line-through" : "text-body")}>{item.label}</span>
          </>
        );
        return (
          <li key={item.key}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => {
                  onToggle(item.key);
                }}
                className="font-ui hover:bg-pill ease-spring -mx-1.5 flex min-h-8 items-center gap-2 rounded-lg px-1.5 text-sm transition-colors duration-[423ms]"
              >
                {content}
              </button>
            ) : (
              <span className="font-ui flex min-h-8 items-center gap-2 text-sm">{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TooltipBox({
  left,
  top,
  width,
  title,
  rows,
}: {
  left: number;
  top: number;
  width: number;
  title: string;
  rows: readonly { key: string; label: string; value: string; color?: ChartColor }[];
}) {
  const boxWidth = 220;
  const x = Math.min(Math.max(left - boxWidth / 2, 0), Math.max(0, width - boxWidth));
  return (
    <div
      role="presentation"
      className="font-ui bg-surface shadow-frame border-line pointer-events-none absolute z-10 w-[220px] rounded-xl border px-3 py-2.5 text-sm"
      style={{ left: x, top }}
    >
      <p className="text-subtle mb-1.5 text-xs">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            {row.color ? <LegendKey color={row.color} shape="line" /> : null}
            <span className="text-ink font-mono font-medium tabular-nums">{row.value}</span>
            <span className="text-subtle ml-auto truncate text-xs">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
