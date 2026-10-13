import { formatTokenAmount, type CommissionPolicy } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { buildPolicy } from "../studio/policy";
import { parseAmount } from "../studio/terms";
import { checkTerms, type TermsCheck } from "../studio/validate";
import { stepErrors } from "./copy-errors";
import { budgetErrors, rewardMessages, type BudgetErrors } from "./derive-budget";
import { endsAtOf, rulesErrors, type RulesErrors } from "./derive-rules";
import type { ComposerFields, ComposerMode, StepKey } from "./fields";

export type ComposerToken = TokenLike & { readonly address: string };

export type ProductLite = {
  readonly id: string;
  readonly title: string;
  readonly priceMinor: bigint;
  readonly version: number;
  readonly category: string;
  readonly categoryLabel: string;
  readonly imageUrl: string | undefined;
};

export type ComposerContext = {
  readonly mode: ComposerMode;
  readonly product: ProductLite | null;
  readonly readyIds: ReadonlySet<string>;
  readonly token: ComposerToken;
  readonly balanceMinor: bigint | null;
  readonly now: number;
  readonly current: CommissionPolicy | null;
  readonly campaignEndsAt: number | null;
};

export type Derived = {
  readonly check: TermsCheck;
  readonly depositMinor: bigint | null;
  readonly limitMinor: bigint | null;
  readonly limitText: string;
  readonly endsAt: number | null;
  readonly policy: CommissionPolicy | null;
  readonly budget: BudgetErrors;
  readonly rules: RulesErrors;
  readonly productError: string | undefined;
  readonly steps: Readonly<Record<StepKey, readonly string[]>>;
};

const doubled = (text: string, decimals: number) => {
  const parsed = parseAmount(text, decimals);
  return parsed.ok ? parsed.value * 2n : null;
};

const plain = (minor: bigint, token: TokenLike) =>
  formatTokenAmount(minor, token.decimals).replaceAll(",", "");

const limitTextOf = (fields: ComposerFields, token: TokenLike) => {
  if (fields.limit.touched) return fields.limit.text;
  const auto = doubled(fields.deposit, token.decimals);
  return auto === null ? "" : plain(auto, token);
};

const productErrorOf = (fields: ComposerFields, context: ComposerContext) => {
  if (context.mode === "newVersion") return undefined;
  if (!fields.productId) return stepErrors.product.missing;
  return context.readyIds.has(fields.productId) ? undefined : stepErrors.product.notReady;
};

export const derive = (fields: ComposerFields, context: ComposerContext): Derived => {
  const priceMinor = context.product?.priceMinor ?? null;
  const check = checkTerms(fields.terms, {
    priceMinor,
    token: context.token,
    variant: "campaign",
  });
  const limitText = limitTextOf(fields, context.token);
  const budget = budgetErrors(fields, limitText, check, context);
  const rules = rulesErrors(fields, check, context.now);
  const endsAt =
    context.mode === "newVersion" ? context.campaignEndsAt : endsAtOf(fields.end, context.now);
  const capMinor = check.pricing?.capMinor ?? null;
  const liability =
    context.current !== null
      ? BigInt(context.current.campaignLiabilityCap)
      : budget.limitMinor !== null && capMinor !== null && budget.limitMinor >= capMinor
        ? budget.limitMinor
        : capMinor;
  const policy =
    check.resolved && liability !== null && endsAt !== null
      ? buildPolicy(check.resolved, fields.terms.shortPathMode, {
          rewardToken: context.current?.rewardToken ?? context.token.address,
          liabilityMinor: liability,
          expiry: BigInt(Math.floor(endsAt / 1000)),
          eligibilityHash: context.current?.eligibilityHash,
        })
      : null;
  const currentLimit = context.current ? BigInt(context.current.campaignLiabilityCap) : null;
  const capOverLimit =
    currentLimit !== null && capMinor !== null && capMinor > currentLimit
      ? fill(stepErrors.budget.capOverLimit, { limit: formatAmount(currentLimit, context.token) })
      : undefined;
  const productError = productErrorOf(fields, context);
  return {
    check,
    depositMinor: budget.depositMinor,
    limitMinor: budget.limitMinor,
    limitText,
    endsAt,
    policy,
    budget,
    rules,
    productError,
    steps: {
      product: productError ? [productError] : [],
      rewards: [...rewardMessages(check), ...(capOverLimit ? [capOverLimit] : [])],
      budget: [budget.deposit, budget.limit, budget.alert].filter((item) => item !== undefined),
      rules: [rules.end, check.errors.hold].filter((item) => item !== undefined),
      review: [],
      launch: [],
    },
  };
};
