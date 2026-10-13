import { derive, type ComposerContext } from "./derive";
import { localToMs } from "./derive-rules";
import type { ComposerFields, StepKey } from "./fields";
import { stepsFor } from "./fields";
import type { DraftInput, DraftRequest } from "./use-draft-save";

export const requestFor = (
  fields: ComposerFields,
  context: ComposerContext,
  reached: StepKey,
  campaignId: string | null,
): DraftRequest | null => {
  const preview = derive(fields, context);
  const previewPolicy = preview.policy;
  const previewEnds = preview.endsAt;
  if (!previewPolicy || previewEnds === null) return null;
  const create = context.mode === "create";
  if (create && !context.product) return null;
  const effectiveMs = create ? null : localToMs(fields.effectiveAt);
  if (!create && (effectiveMs === null || campaignId === null)) return null;
  const stepReached = Math.max(0, stepsFor("create").indexOf(reached));
  const key = JSON.stringify({
    mode: context.mode,
    productId: fields.productId,
    terms: fields.terms,
    end: fields.end,
    limitText: preview.limitText,
    inviteOnly: fields.inviteOnly,
    effectiveAt: fields.effectiveAt,
    stepReached,
  });
  const build = (version: number, keepEndsAt: string | null): DraftInput => {
    const kept = keepEndsAt === null ? null : Date.parse(keepEndsAt);
    const fresh = derive(fields, {
      ...context,
      now:
        kept === null || fields.end.kind !== "preset"
          ? Date.now()
          : kept - fields.end.days * 86_400_000,
    });
    const current =
      fresh.policy && fresh.endsAt !== null
        ? { policy: fresh.policy, endsAt: fresh.endsAt }
        : { policy: previewPolicy, endsAt: previewEnds };
    const common = {
      policy: current.policy,
      endsAt: new Date(current.endsAt).toISOString(),
      inviteOnly: fields.inviteOnly,
      stepReached,
      version,
    };
    return create && context.product
      ? {
          ...common,
          mode: "create",
          productId: context.product.id,
          productVersion: context.product.version,
        }
      : {
          ...common,
          mode: "newVersion",
          campaignId: campaignId ?? "",
          effectiveAt: new Date(effectiveMs ?? Date.now()).toISOString(),
        };
  };
  return { key, endKey: JSON.stringify(fields.end), build };
};
