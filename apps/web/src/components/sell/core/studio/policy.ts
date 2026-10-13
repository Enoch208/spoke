import { commissionPolicy, formatTokenAmount, type CommissionPolicy } from "@spoke/protocol";
import { zeroHash } from "viem";
import type { TokenLike } from "@/lib/format";
import { bpsText, holdChoiceOf, type StudioTerms } from "./terms";
import { formulaCapMinor, type ResolvedTerms } from "./validate";

export type PolicyContext = {
  readonly rewardToken: string;
  readonly liabilityMinor: bigint;
  readonly expiry: bigint;
  readonly eligibilityHash?: string | undefined;
};

export const buildPolicy = (
  resolved: ResolvedTerms,
  shortPathMode: StudioTerms["shortPathMode"],
  context: PolicyContext,
): CommissionPolicy | null => {
  if (resolved.holdSeconds === null) return null;
  const parsed = commissionPolicy.safeParse({
    rewardToken: context.rewardToken,
    commissionBps: resolved.rateBps,
    perSaleCap: resolved.capMinor.toString(),
    campaignLiabilityCap: context.liabilityMinor.toString(),
    maxRewardedAncestors: resolved.weightsBps.length,
    weightsBps: [...resolved.weightsBps],
    shortPathMode,
    holdSeconds: resolved.holdSeconds,
    expiry: context.expiry.toString(),
    eligibilityHash: context.eligibilityHash ?? zeroHash,
  });
  return parsed.success ? parsed.data : null;
};

export const templatePolicy = (
  resolved: ResolvedTerms,
  shortPathMode: StudioTerms["shortPathMode"],
  token: TokenLike & { readonly address: string },
) =>
  buildPolicy(resolved, shortPathMode, {
    rewardToken: token.address,
    liabilityMinor:
      resolved.capMinor > formulaCapMinor(token) ? resolved.capMinor : formulaCapMinor(token),
    expiry: 0n,
  });

export const termsFromPolicy = (
  policy: Pick<
    CommissionPolicy,
    "commissionBps" | "perSaleCap" | "weightsBps" | "shortPathMode" | "holdSeconds"
  >,
  token: TokenLike,
  formulaMinor: bigint | null,
): StudioTerms => {
  const cap = BigInt(policy.perSaleCap);
  const formula = cap >= formulaCapMinor(token) || (formulaMinor !== null && cap === formulaMinor);
  return {
    rate: bpsText(policy.commissionBps),
    cap: formula
      ? { mode: "formula" }
      : { mode: "fixed", text: formatTokenAmount(cap, token.decimals).replaceAll(",", "") },
    weights: policy.weightsBps.map(bpsText),
    keepTotal: true,
    shortPathMode: policy.shortPathMode,
    hold: holdChoiceOf(policy.holdSeconds),
  };
};
