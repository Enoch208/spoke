import { computeReward, formatTokenAmount, type ClientOutput } from "@spoke/protocol";
import { myTemplates } from "../studio/library";
import { termsFromPolicy } from "../studio/policy";
import { startingPoints, type LibraryTemplate } from "../studio/starting-points";
import type { ComposerToken, ProductLite } from "./derive";
import { msToLocal } from "./derive-rules";
import {
  blankFields,
  createSteps,
  isStepKey,
  readExtras,
  type ComposerFields,
  type StepKey,
} from "./fields";
import type { Draft } from "./use-draft-save";

type Product = ClientOutput<"products.list">["items"][number];
type Templates = ClientOutput<"studio.templates">;
type PolicySet = ClientOutput<"campaigns.policy">;

export type Categories = ClientOutput<"products.categories">;

export const productLite = (product: Product, categories: Categories = []): ProductLite => ({
  id: product.id,
  title: product.title,
  priceMinor: BigInt(product.priceBaseUnits),
  version: product.version,
  category: product.category,
  categoryLabel:
    categories.find((category) => category.id === product.category)?.name ?? product.category,
  imageUrl: product.media.find((asset) => asset.kind === "image")?.url,
});

export const isReady = (product: Product) =>
  BigInt(product.priceBaseUnits) > 0n &&
  product.billingPeriod === null &&
  Boolean(product.deliverable);

export const libraryFor = (
  templates: Templates | undefined,
  token: ComposerToken,
): LibraryTemplate[] => [...startingPoints, ...myTemplates(templates ?? [], token)];

const formulaAt = (product: ProductLite | null, commissionBps: number) =>
  product ? computeReward(product.priceMinor, commissionBps, product.priceMinor) : null;

export type CreateSources = {
  readonly scope: string;
  readonly draftId: string;
  readonly draft: Draft | null;
  readonly products: readonly ProductLite[];
  readonly token: ComposerToken;
  readonly alertDefault: number;
  readonly productParam: string | null;
  readonly template: LibraryTemplate | null;
  readonly from: { readonly policy: PolicySet["current"]; readonly productId: string } | null;
};

export const createFields = (sources: CreateSources): ComposerFields => {
  const base = blankFields(sources.alertDefault);
  const { draft, token, products } = sources;
  if (draft) {
    const product = products.find((item) => item.id === draft.productId) ?? null;
    const extras = readExtras(sources.scope, sources.draftId) ?? {
      deposit: "",
      limit: {
        touched: true,
        text: formatTokenAmount(
          BigInt(draft.policy.campaignLiabilityCap),
          token.decimals,
        ).replaceAll(",", ""),
      },
      alertSales: base.alertSales,
      end: { kind: "custom" as const, local: msToLocal(Date.parse(draft.endsAt)) },
      template: null,
    };
    return {
      ...base,
      ...extras,
      productId: draft.productId,
      inviteOnly: draft.inviteOnly,
      terms: termsFromPolicy(draft.policy, token, formulaAt(product, draft.policy.commissionBps)),
    };
  }
  const ready = (id: string | null) => (id && products.some((item) => item.id === id) ? id : null);
  if (sources.from) {
    const product = products.find((item) => item.id === sources.from?.productId) ?? null;
    return {
      ...base,
      productId: ready(sources.from.productId),
      terms: termsFromPolicy(
        sources.from.policy,
        token,
        formulaAt(product, sources.from.policy.commissionBps),
      ),
    };
  }
  return {
    ...base,
    productId: ready(sources.productParam),
    ...(sources.template
      ? {
          terms: sources.template.terms,
          template: { name: sources.template.name, version: sources.template.version },
        }
      : {}),
  };
};

export const createStep = (param: string | null, draft: Draft | null): StepKey => {
  const step = isStepKey(param)
    ? param
    : draft
      ? (createSteps[draft.stepReached] ?? "product")
      : "product";
  return step === "launch" ? "review" : step;
};
