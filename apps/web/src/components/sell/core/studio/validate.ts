import { computeReward } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import type { TokenLike } from "@/lib/format";
import { rewardErrors } from "./copy-errors";
import {
  bpsText,
  holdSecondsOf,
  maxHoldSeconds,
  minHoldSeconds,
  parseAmount,
  parsePercent,
  type NumberParse,
  type StudioTerms,
} from "./terms";
import { weightTotal } from "./weights";

export type TermsVariant = "campaign" | "template";

export type TermsErrors = {
  readonly rate?: string | undefined;
  readonly cap?: string | undefined;
  readonly reward?: string | undefined;
  readonly weights?: string | undefined;
  readonly hold?: string | undefined;
  readonly levels: readonly (string | undefined)[];
};

export type ResolvedTerms = {
  readonly rateBps: number;
  readonly capMinor: bigint;
  readonly formulaMinor: bigint | null;
  readonly rewardMinor: bigint | null;
  readonly weightsBps: readonly number[];
  readonly holdSeconds: number | null;
};

export type Pricing = Pick<ResolvedTerms, "rateBps" | "capMinor" | "formulaMinor" | "rewardMinor">;

export type TermsCheck = {
  readonly errors: TermsErrors;
  readonly pricing: Pricing | null;
  readonly resolved: ResolvedTerms | null;
};

export const formulaCapMinor = (token: TokenLike) => 10_000n * 10n ** BigInt(token.decimals);

const rateError = (parsed: NumberParse<number>) => {
  if (!parsed.ok)
    return parsed.reason === "empty"
      ? rewardErrors.rateEmpty
      : parsed.reason === "decimals"
        ? rewardErrors.decimals
        : rewardErrors.rateRange;
  return parsed.value < 1 || parsed.value > 10_000 ? rewardErrors.rateRange : undefined;
};

const capError = (parsed: NumberParse<bigint>, token: TokenLike) => {
  if (parsed.ok) return parsed.value === 0n ? rewardErrors.capZero : undefined;
  if (parsed.reason === "empty") return rewardErrors.capEmpty;
  if (parsed.reason === "decimals")
    return fill(rewardErrors.tokenDecimals, {
      symbol: token.symbol,
      decimals: String(token.decimals),
    });
  return rewardErrors.capInvalid;
};

const weightError = (text: string, level: number) => {
  const parsed = parsePercent(text);
  if (parsed.ok) return parsed.value < 1 ? rewardErrors.weightZero : undefined;
  if (parsed.reason === "empty") return fill(rewardErrors.weightEmpty, { level: String(level) });
  return parsed.reason === "decimals" ? rewardErrors.decimals : rewardErrors.weightInvalid;
};

const totalError = (weights: readonly string[]) => {
  const total = weightTotal(weights);
  if (total.kind === "under")
    return fill(rewardErrors.totalUnder, {
      total: bpsText(total.totalBps),
      left: bpsText(total.leftBps),
    });
  if (total.kind === "over")
    return fill(rewardErrors.totalOver, {
      total: bpsText(total.totalBps),
      over: bpsText(total.overBps),
    });
  return undefined;
};

const holdError = (terms: StudioTerms) => {
  const seconds = holdSecondsOf(terms.hold);
  if (seconds === null) return rewardErrors.holdInvalid;
  if (seconds < minHoldSeconds) return rewardErrors.holdMin;
  return seconds > maxHoldSeconds ? rewardErrors.holdMax : undefined;
};

export const checkTerms = (
  terms: StudioTerms,
  context: { priceMinor: bigint | null; token: TokenLike; variant: TermsVariant },
): TermsCheck => {
  const rate = parsePercent(terms.rate);
  const cap =
    terms.cap.mode === "fixed" ? parseAmount(terms.cap.text, context.token.decimals) : null;
  const levels = terms.weights.map((weight, index) => weightError(weight, index + 1));
  const errors = {
    rate: rateError(rate),
    cap: cap ? capError(cap, context.token) : undefined,
    weights: levels.some(Boolean) ? undefined : totalError(terms.weights),
    hold: holdError(terms),
    levels,
  };
  const weightsBps = terms.weights.map((weight) => parsePercent(weight));
  const holdSeconds = holdSecondsOf(terms.hold);
  if (!rate.ok || errors.rate || errors.cap) return { errors, pricing: null, resolved: null };
  const price = context.priceMinor;
  const formulaMinor = price === null ? null : computeReward(price, rate.value, price);
  const capMinor =
    cap?.ok === true
      ? cap.value
      : context.variant === "template"
        ? formulaCapMinor(context.token)
        : (formulaMinor ?? 0n);
  const rewardMinor = price === null ? null : computeReward(price, rate.value, capMinor);
  const reward =
    price === null && context.variant === "campaign"
      ? rewardErrors.noPrice
      : rewardMinor === 0n
        ? rewardErrors.rewardZero
        : undefined;
  const pricing = { rateBps: rate.value, capMinor, formulaMinor, rewardMinor };
  const weightsReady = !errors.weights && !levels.some(Boolean);
  return {
    errors: { ...errors, reward },
    pricing,
    resolved: weightsReady
      ? {
          ...pricing,
          weightsBps: weightsBps.map((parsed) => (parsed.ok ? parsed.value : 0)),
          holdSeconds: errors.hold ? null : holdSeconds,
        }
      : null,
  };
};
