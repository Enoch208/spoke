import { fill } from "@/lib/copy";
import { formatAmount, formatBps, formatTimestampFull } from "@/lib/format";
import type { ResolvedTerms } from "../studio/validate";
import { reviewCopy } from "./copy-rules";
import type { ComposerToken, ProductLite } from "./derive";
import type { StepKey } from "./fields";
import type { ShortPathMode } from "../studio/terms";
import { holdAdjective } from "../studio/terms-text";

const copy = reviewCopy.terms;

export type PlainTerm = { readonly text: string; readonly step: StepKey | null };

export type TermsInput = {
  readonly product: ProductLite | null;
  readonly token: ComposerToken;
  readonly resolved: ResolvedTerms;
  readonly shortPathMode: ShortPathMode;
  readonly depositMinor: bigint | null;
  readonly limitMinor: bigint | null;
  readonly inviteOnly: boolean;
  readonly endsAt: number | null;
  readonly disclosure: string;
  readonly contact: string | null;
  readonly chainId: number;
};

export const rewardTerms = (input: TermsInput): PlainTerm[] => {
  const { resolved, token } = input;
  const count = resolved.weightsBps.length;
  const reward = resolved.rewardMinor ?? 0n;
  const terms: PlainTerm[] = [
    {
      step: "rewards",
      text: fill(copy.reward, {
        rate: formatBps(resolved.rateBps),
        cap: formatAmount(resolved.capMinor, token),
        reward: formatAmount(reward, token),
      }),
    },
    {
      step: "rewards",
      text:
        count === 1
          ? copy.levelsOne
          : fill(copy.levels, {
              count: String(count),
              weights: resolved.weightsBps.map(formatBps).join(", "),
            }),
    },
  ];
  if (count > 1)
    terms.push({
      step: "rewards",
      text: fill(
        input.shortPathMode === "RENORMALIZE_EXISTING" ? copy.renormalize : copy.returnUnused,
        {
          count: String(count),
        },
      ),
    });
  terms.push({ step: null, text: copy.realSales });
  if (resolved.holdSeconds !== null)
    terms.push({
      step: "rules",
      text: fill(copy.hold, { hold: holdAdjective(resolved.holdSeconds) }),
    });
  return terms;
};

export const campaignTerms = (input: TermsInput): PlainTerm[] => {
  const { token, product } = input;
  const lead: PlainTerm[] = product
    ? [
        {
          step: "product",
          text: fill(copy.price, {
            price: formatAmount(product.priceMinor, token),
            tokenLabel: "testnet demo token",
            product: product.title,
            version: String(product.version),
          }),
        },
      ]
    : [];
  const money: PlainTerm[] =
    input.depositMinor !== null && input.limitMinor !== null
      ? [
          {
            step: "budget",
            text: fill(copy.deposit, {
              deposit: formatAmount(input.depositMinor, token),
              limit: formatAmount(input.limitMinor, token),
            }),
          },
        ]
      : [];
  const ends: PlainTerm[] =
    input.endsAt === null
      ? []
      : [
          {
            step: "rules",
            text: fill(copy.ends, { date: formatTimestampFull(new Date(input.endsAt)) }),
          },
        ];
  return [
    ...lead,
    ...rewardTerms(input),
    ...money,
    { step: "rules", text: copy.excluded },
    { step: "rules", text: input.inviteOnly ? copy.inviteOnly : copy.anyone },
    { step: "rules", text: copy.regions },
    ...ends,
    { step: "rules", text: fill(copy.disclosure, { disclosure: input.disclosure }) },
    { step: null, text: copy.claims },
    {
      step: null,
      text: fill(copy.chain, { symbol: token.symbol, chainId: String(input.chainId) }),
    },
    ...(input.contact
      ? [{ step: null, text: fill(copy.contact, { contact: input.contact }) }]
      : []),
  ];
};
