import { maxOf, ratio } from "./scale";

export function Sparkline({
  values,
  label,
  width = 96,
  height = 28,
}: {
  values: readonly bigint[];
  label: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const top = maxOf(values);
  const pad = 4;
  const span = width - pad * 2;
  const points = values.map((value, index) => [
    pad + (index * span) / (values.length - 1),
    height - pad - ratio(value, top) * (height - pad * 2),
  ]);
  const path = (list: readonly number[][]) =>
    list
      .map(([x = 0, y = 0], index) => `${index === 0 ? "M" : "L"}${String(x)},${String(y)}`)
      .join(" ");
  const last = points.at(-1) ?? [0, 0];
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className="block shrink-0 overflow-visible"
    >
      <path
        d={path(points.slice(0, -1))}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-chart-context"
      />
      <path
        d={path(points.slice(-2))}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        className="stroke-chart-settled"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={4}
        strokeWidth={2}
        className="fill-chart-settled stroke-surface"
      />
    </svg>
  );
}
