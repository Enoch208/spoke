import {
  formatTokenAmount,
  protocolLimits,
  type CommissionPolicy,
  type RecipientCount,
} from "@spoke/protocol";
import { parseUnits } from "viem";

export type ShortPathMode = CommissionPolicy["shortPathMode"];
export type CapRule =
  { readonly mode: "formula" } | { readonly mode: "fixed"; readonly text: string };
export type HoldUnit = "minutes" | "hours" | "days";
export type HoldChoice =
  | { readonly kind: "preset"; readonly seconds: number }
  | { readonly kind: "custom"; readonly amount: string; readonly unit: HoldUnit };

export type StudioTerms = {
  readonly rate: string;
  readonly cap: CapRule;
  readonly weights: readonly string[];
  readonly keepTotal: boolean;
  readonly shortPathMode: ShortPathMode;
  readonly hold: HoldChoice;
};

export const holdPresets = [600, 3_600, 86_400, 259_200, 604_800, 1_209_600] as const;
export const holdUnitSeconds: Record<HoldUnit, number> = {
  minutes: 60,
  hours: 3_600,
  days: 86_400,
};
export const minHoldSeconds = 60;
export const maxHoldSeconds = protocolLimits.maxSettlementHoldSeconds;
export const maxComposerLevels = protocolLimits.maxComposerRewardedAncestors;
export const levelChoices = [1, 2, 3, 4, 5] as const satisfies readonly RecipientCount[];

export const bpsText = (bps: number) => formatTokenAmount(BigInt(bps), 2, 2);

export type NumberParse<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: "empty" | "invalid" | "decimals" };

const decimalPattern = /^\d+(\.\d+)?$/;

const parseDecimal = (text: string, decimals: number): NumberParse<bigint> => {
  const value = text.trim().replaceAll(",", "");
  if (!value) return { ok: false, reason: "empty" };
  if (!decimalPattern.test(value)) return { ok: false, reason: "invalid" };
  if ((value.split(".")[1] ?? "").length > decimals) return { ok: false, reason: "decimals" };
  return { ok: true, value: parseUnits(value, decimals) };
};

export const parsePercent = (text: string): NumberParse<number> => {
  const parsed = parseDecimal(text, 2);
  if (!parsed.ok) return parsed;
  if (parsed.value > 1_000_000n) return { ok: false, reason: "invalid" };
  return { ok: true, value: Number(parsed.value) };
};

export const parseAmount = (text: string, decimals: number): NumberParse<bigint> =>
  parseDecimal(text, decimals);

export const parsedBps = (weights: readonly string[]): number[] | null => {
  const values: number[] = [];
  for (const weight of weights) {
    const parsed = parsePercent(weight);
    if (!parsed.ok) return null;
    values.push(parsed.value);
  }
  return values;
};

export const holdSecondsOf = (hold: HoldChoice): number | null => {
  if (hold.kind === "preset") return hold.seconds;
  const amount = hold.amount.trim();
  if (!/^\d+$/.test(amount)) return null;
  return Number(amount) * holdUnitSeconds[hold.unit];
};

export const holdChoiceOf = (seconds: number): HoldChoice => {
  if (holdPresets.some((preset) => preset === seconds)) return { kind: "preset", seconds };
  const unit: HoldUnit =
    seconds % holdUnitSeconds.days === 0
      ? "days"
      : seconds % holdUnitSeconds.hours === 0
        ? "hours"
        : "minutes";
  return { kind: "custom", amount: String(Math.floor(seconds / holdUnitSeconds[unit])), unit };
};

export const defaultTerms: StudioTerms = {
  rate: bpsText(1_000),
  cap: { mode: "formula" },
  weights: [5_000, 2_500, 1_500, 1_000].map(bpsText),
  keepTotal: true,
  shortPathMode: "RENORMALIZE_EXISTING",
  hold: { kind: "preset", seconds: protocolLimits.defaultSettlementHoldSeconds },
};
