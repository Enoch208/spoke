export type Formatter = (value: bigint) => string;

export const chartColors = {
  settled: { fill: "fill-chart-settled", stroke: "stroke-chart-settled", bg: "bg-chart-settled" },
  reserved: {
    fill: "fill-chart-reserved",
    stroke: "stroke-chart-reserved",
    bg: "bg-chart-reserved",
  },
  refunded: {
    fill: "fill-chart-refunded",
    stroke: "stroke-chart-refunded",
    bg: "bg-chart-refunded",
  },
  pending: { fill: "fill-chart-pending", stroke: "stroke-chart-pending", bg: "bg-chart-pending" },
  context: { fill: "fill-chart-context", stroke: "stroke-chart-context", bg: "bg-chart-context" },
  depth1: { fill: "fill-chart-depth-1", stroke: "stroke-chart-depth-1", bg: "bg-chart-depth-1" },
  depth2: { fill: "fill-chart-depth-2", stroke: "stroke-chart-depth-2", bg: "bg-chart-depth-2" },
  depth3: { fill: "fill-chart-depth-3", stroke: "stroke-chart-depth-3", bg: "bg-chart-depth-3" },
  depth4: { fill: "fill-chart-depth-4", stroke: "stroke-chart-depth-4", bg: "bg-chart-depth-4" },
  depth5: { fill: "fill-chart-depth-5", stroke: "stroke-chart-depth-5", bg: "bg-chart-depth-5" },
} as const;

export type ChartColor = keyof typeof chartColors;

export const depthColors = ["depth1", "depth2", "depth3", "depth4", "depth5"] as const;

const precision = 1_000_000n;

export const ratio = (value: bigint, max: bigint) => {
  if (max <= 0n || value <= 0n) return 0;
  const clamped = value > max ? max : value;
  return Number((clamped * precision) / max) / Number(precision);
};

export const maxOf = (values: readonly bigint[]) =>
  values.reduce((top, value) => (value > top ? value : top), 0n);

const steps = [1n, 2n, 5n, 10n] as const;

const niceStep = (raw: bigint) => {
  if (raw <= 1n) return 1n;
  const power = 10n ** BigInt(raw.toString().length - 1);
  const lead = (raw + power - 1n) / power;
  const multiplier = steps.find((step) => step >= lead) ?? 10n;
  return multiplier * power;
};

export const niceTicks = (max: bigint, count = 4) => {
  const step = niceStep(max <= 0n ? 1n : (max + BigInt(count) - 1n) / BigInt(count));
  const ticks: bigint[] = [0n];
  while ((ticks.at(-1) ?? 0n) < max) ticks.push((ticks.at(-1) ?? 0n) + step);
  if (ticks.length === 1) ticks.push(step);
  return ticks;
};

export const shareBps = (part: bigint, whole: bigint) =>
  whole <= 0n ? 0 : Number((part * 10_000n + whole / 2n) / whole);
