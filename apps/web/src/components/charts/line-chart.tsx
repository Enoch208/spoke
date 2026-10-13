"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { chartCopy } from "./copy";
import { TooltipBox } from "./legend";
import { chartColors, maxOf, niceTicks, ratio, type ChartColor, type Formatter } from "./scale";
import { useWidth } from "./use-width";
import { AxisLabels, endLabels, plotBox, xAt, YGrid } from "./axes";

export type LineSeries = {
  key: string;
  label: string;
  color: ChartColor;
  values: readonly bigint[];
  wash?: boolean;
};

export function LineChart({
  title,
  labels,
  series,
  format,
  hidden,
  height = 240,
}: {
  title: string;
  labels: readonly string[];
  series: readonly LineSeries[];
  format: Formatter;
  hidden?: ReadonlySet<string>;
  height?: number;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const shown = series.filter((line) => !hidden?.has(line.key));
  const ticks = niceTicks(maxOf(shown.flatMap((line) => line.values)));
  const top = ticks.at(-1) ?? 1n;
  const box = plotBox(width, height, ticks.map(format), width >= 560);
  const count = labels.length;
  const yAt = (value: bigint) => box.top + box.height - ratio(value, top) * box.height;
  const points = (line: LineSeries) =>
    line.values.map((value, index) => [box.left + xAt(index, count, box.width), yAt(value)]);
  const pathOf = (line: LineSeries) =>
    points(line)
      .map(([x, y], index) => `${index === 0 ? "M" : "L"}${String(x)},${String(y)}`)
      .join(" ");
  const pick = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - bounds.left;
    const step = count > 1 ? box.width / (count - 1) : box.width;
    setActive(Math.min(count - 1, Math.max(0, Math.round(offset / step))));
  };
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const start = active ?? count - 1;
    setActive(Math.min(count - 1, Math.max(0, start + (event.key === "ArrowRight" ? 1 : -1))));
  };
  const readout =
    active === null
      ? null
      : series.map((line) => ({
          key: line.key,
          label: line.label,
          value: format(line.values[active] ?? 0n),
          color: line.color,
        }));
  const crossX = active === null ? 0 : box.left + xAt(active, count, box.width);
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
        <AxisLabels labels={labels} box={box} />
        {shown.map((line) =>
          line.wash && count > 1 ? (
            <path
              key={`${line.key}-wash`}
              d={`${pathOf(line)} L${String(box.left + box.width)},${String(box.top + box.height)} L${String(box.left)},${String(box.top + box.height)} Z`}
              className={chartColors[line.color].fill}
              fillOpacity={0.1}
            />
          ) : null,
        )}
        {shown.map((line) => (
          <path
            key={line.key}
            d={pathOf(line)}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={chartColors[line.color].stroke}
          />
        ))}
        {box.endLabels
          ? endLabels(
              shown.map((line) => ({
                key: line.key,
                label: line.label,
                y: yAt(line.values.at(-1) ?? 0n),
              })),
            ).map((label) => (
              <text
                key={label.key}
                x={box.left + box.width + 10}
                y={label.y + 4}
                className="fill-body font-ui text-[12px]"
              >
                {label.label}
              </text>
            ))
          : null}
        {active !== null ? (
          <g>
            <line
              x1={crossX}
              x2={crossX}
              y1={box.top}
              y2={box.top + box.height}
              className="stroke-line"
              strokeWidth={1}
            />
            {shown.map((line) => (
              <circle
                key={line.key}
                cx={crossX}
                cy={yAt(line.values[active] ?? 0n)}
                r={5}
                strokeWidth={2}
                className={cx(chartColors[line.color].fill, "stroke-surface")}
              />
            ))}
          </g>
        ) : null}
        <rect
          x={box.left}
          y={box.top}
          width={Math.max(1, box.width)}
          height={box.height}
          fill="transparent"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => {
            setActive(null);
          }}
        />
      </svg>
      {readout && active !== null ? (
        <TooltipBox
          left={crossX}
          top={4}
          width={width}
          title={labels[active] ?? ""}
          rows={readout}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {readout && active !== null
          ? `${labels[active] ?? ""}: ${readout.map((row) => `${row.label} ${row.value}`).join(", ")}`
          : ""}
      </p>
    </div>
  );
}
