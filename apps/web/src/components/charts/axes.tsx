import { ratio, type Formatter } from "./scale";

export type PlotBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  endLabels: boolean;
};

const charWidth = 7;

export const plotBox = (
  width: number,
  height: number,
  tickLabels: readonly string[],
  withEndLabels: boolean,
  bottom = 28,
): PlotBox => {
  const longest = Math.max(1, ...tickLabels.map((label) => label.length));
  const left = Math.min(96, longest * charWidth + 12);
  const right = withEndLabels ? 112 : 12;
  return {
    left,
    top: 12,
    width: Math.max(40, width - left - right),
    height: Math.max(60, height - 12 - bottom),
    endLabels: withEndLabels,
  };
};

export const xAt = (index: number, count: number, span: number) =>
  count <= 1 ? span / 2 : (index * span) / (count - 1);

export const bandAt = (index: number, count: number, span: number) => {
  const band = span / Math.max(1, count);
  return { center: band * index + band / 2, band };
};

export function YGrid({
  ticks,
  top,
  box,
  format,
}: {
  ticks: readonly bigint[];
  top: bigint;
  box: PlotBox;
  format: Formatter;
}) {
  return (
    <g>
      {ticks.map((tick) => {
        const y = box.top + box.height - ratio(tick, top) * box.height;
        return (
          <g key={tick.toString()}>
            <line
              x1={box.left}
              x2={box.left + box.width}
              y1={y}
              y2={y}
              strokeWidth={1}
              className={tick === 0n ? "stroke-line" : "stroke-hairline"}
            />
            <text
              x={box.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-subtle font-mono text-[11px] tabular-nums"
            >
              {format(tick)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function AxisLabels({
  labels,
  box,
  banded = false,
}: {
  labels: readonly string[];
  box: PlotBox;
  banded?: boolean;
}) {
  const room = Math.max(1, Math.floor(box.width / 72));
  const stride = Math.max(1, Math.ceil(labels.length / room));
  return (
    <g>
      {labels.map((label, index) => {
        const last = index === labels.length - 1;
        if (index % stride !== 0 && !last) return null;
        if (!last && labels.length - 1 - index < stride && index !== 0) return null;
        const x =
          box.left +
          (banded
            ? bandAt(index, labels.length, box.width).center
            : xAt(index, labels.length, box.width));
        return (
          <text
            key={`${label}-${String(index)}`}
            x={x}
            y={box.top + box.height + 18}
            textAnchor={
              !banded && labels.length > 1
                ? index === 0
                  ? "start"
                  : last
                    ? "end"
                    : "middle"
                : "middle"
            }
            className="fill-subtle font-ui text-[11px]"
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

export const endLabels = (labels: readonly { key: string; label: string; y: number }[]) => {
  const placed: { key: string; label: string; y: number }[] = [];
  for (const label of [...labels].sort((a, b) => a.y - b.y)) {
    const previous = placed.at(-1);
    if (!previous || label.y - previous.y >= 14) placed.push(label);
  }
  return placed;
};
