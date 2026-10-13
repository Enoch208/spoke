import { fill } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { parseAmount, type NumberParse } from "../studio/terms";
import type { TermsCheck } from "../studio/validate";
import { stepErrors } from "./copy-errors";
import type { ComposerFields } from "./fields";

const copy = stepErrors.budget;

export type BudgetErrors = {
  readonly deposit: string | undefined;
  readonly limit: string | undefined;
  readonly alert: string | undefined;
  readonly depositMinor: bigint | null;
  readonly limitMinor: bigint | null;
};

const formatError = (
  parsed: NumberParse<bigint>,
  token: TokenLike,
  empty: string,
  invalid: string,
) => {
  if (parsed.ok) return undefined;
  if (parsed.reason === "empty") return empty;
  if (parsed.reason === "decimals")
    return fill(copy.decimals, { symbol: token.symbol, decimals: String(token.decimals) });
  return invalid;
};

const alertError = (text: string) => {
  const value = Number(text.trim());
  return /^\d+$/.test(text.trim()) && value >= 1 && value <= 50 ? undefined : copy.alertRange;
};

export const budgetErrors = (
  fields: ComposerFields,
  limitText: string,
  check: TermsCheck,
  context: { readonly token: TokenLike; readonly balanceMinor: bigint | null },
): BudgetErrors => {
  const { token, balanceMinor } = context;
  const deposit = parseAmount(fields.deposit, token.decimals);
  const limit = parseAmount(limitText, token.decimals);
  const reward = check.pricing?.rewardMinor ?? null;
  const cap = check.pricing?.capMinor ?? null;
  const depositMinor = deposit.ok ? deposit.value : null;
  const limitMinor = limit.ok ? limit.value : null;
  const depositFormat = formatError(deposit, token, copy.depositEmpty, copy.depositInvalid);
  const limitFormat = formatError(limit, token, copy.limitEmpty, copy.limitInvalid);
  const depositRule =
    depositMinor === null
      ? undefined
      : reward === null || reward === 0n
        ? copy.needsRewards
        : depositMinor < reward
          ? fill(copy.depositLow, { reward: formatAmount(reward, token) })
          : balanceMinor !== null && depositMinor > balanceMinor
            ? fill(copy.depositBalance, {
                balance: formatAmount(balanceMinor, token),
                symbol: token.symbol,
              })
            : limitMinor !== null && depositMinor > limitMinor
              ? fill(copy.depositOverLimit, { limit: formatAmount(limitMinor, token) })
              : undefined;
  const limitRule =
    limitMinor === null || reward === null
      ? undefined
      : limitMinor < reward
        ? fill(copy.limitLow, { reward: formatAmount(reward, token) })
        : cap !== null && limitMinor < cap
          ? fill(copy.limitBelowCap, { cap: formatAmount(cap, token) })
          : undefined;
  return {
    deposit: depositFormat ?? depositRule,
    limit: limitFormat ?? limitRule,
    alert: alertError(fields.alertSales),
    depositMinor,
    limitMinor,
  };
};

export const rewardMessages = (check: TermsCheck): string[] =>
  [check.errors.rate, check.errors.cap, check.errors.reward, check.errors.weights]
    .concat(check.errors.levels)
    .filter((item) => item !== undefined);
