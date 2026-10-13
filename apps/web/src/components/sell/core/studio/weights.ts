import { bpsText, parsePercent, parsedBps } from "./terms";

export const presetNames = ["nearestHeavy", "even", "steep"] as const;
export type PresetName = (typeof presetNames)[number];

const presetTable: Record<PresetName, readonly (readonly number[])[]> = {
  nearestHeavy: [
    [10_000],
    [7_000, 3_000],
    [6_000, 2_500, 1_500],
    [5_000, 2_500, 1_500, 1_000],
    [4_500, 2_500, 1_500, 1_000, 500],
  ],
  even: [
    [10_000],
    [5_000, 5_000],
    [3_334, 3_333, 3_333],
    [2_500, 2_500, 2_500, 2_500],
    [2_000, 2_000, 2_000, 2_000, 2_000],
  ],
  steep: [
    [10_000],
    [8_000, 2_000],
    [7_000, 2_000, 1_000],
    [6_000, 2_500, 1_000, 500],
    [5_000, 2_500, 1_250, 750, 500],
  ],
};

export const presetBps = (name: PresetName, levels: number): readonly number[] =>
  presetTable[name][levels - 1] ?? presetTable.nearestHeavy[3] ?? [10_000];

export const presetWeights = (name: PresetName, levels: number): string[] =>
  presetBps(name, levels).map(bpsText);

export type WeightEdit =
  | { readonly ok: true; readonly weights: readonly string[] }
  | { readonly ok: false; readonly refused: "levelOneFloor" };

const totalBps = 10_000;

export const balanceLevelOne = (weights: readonly string[]): WeightEdit => {
  const others = parsedBps(weights.slice(1));
  if (!others) return { ok: true, weights };
  const rest = totalBps - others.reduce((sum, value) => sum + value, 0);
  if (rest < 1) return { ok: false, refused: "levelOneFloor" };
  return { ok: true, weights: [bpsText(rest), ...weights.slice(1)] };
};

export const editWeight = (
  weights: readonly string[],
  index: number,
  text: string,
  keepTotal: boolean,
): WeightEdit => {
  const next = weights.map((weight, position) => (position === index ? text : weight));
  if (!keepTotal || index === 0) return { ok: true, weights: next };
  return balanceLevelOne(next);
};

export const stepWeight = (
  weights: readonly string[],
  index: number,
  deltaBps: number,
  keepTotal: boolean,
): WeightEdit => {
  const current = parsePercent(weights[index] ?? "");
  const base = current.ok ? current.value : 0;
  const next = Math.min(totalBps, Math.max(1, base + deltaBps));
  return editWeight(weights, index, bpsText(next), keepTotal);
};

export type WeightTotal =
  | { readonly kind: "exact" }
  | { readonly kind: "under"; readonly totalBps: number; readonly leftBps: number }
  | { readonly kind: "over"; readonly totalBps: number; readonly overBps: number }
  | { readonly kind: "incomplete" };

export const weightTotal = (weights: readonly string[]): WeightTotal => {
  const values = parsedBps(weights);
  if (!values) return { kind: "incomplete" };
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === totalBps) return { kind: "exact" };
  return total < totalBps
    ? { kind: "under", totalBps: total, leftBps: totalBps - total }
    : { kind: "over", totalBps: total, overBps: total - totalBps };
};

export const upstreamHeavier = (weightsBps: readonly number[]) => {
  const [nearest = 0, ...rest] = weightsBps;
  return rest.some((weight) => weight > nearest);
};
