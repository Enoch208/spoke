import { z } from "zod";
import { defaultTerms, type StudioTerms } from "../studio/terms";

export const createSteps = ["product", "rewards", "budget", "rules", "review", "launch"] as const;
export const versionSteps = ["rewards", "rules", "review"] as const;
export type StepKey = (typeof createSteps)[number];
export type ComposerMode = "create" | "newVersion";

export const stepsFor = (mode: ComposerMode): readonly StepKey[] =>
  mode === "create" ? createSteps : versionSteps;

export const isStepKey = (value: string | null): value is StepKey =>
  createSteps.some((step) => step === value);

export const endPresets = [30, 90, 180, 365] as const;

const endChoice = z.union([
  z.object({ kind: z.literal("preset"), days: z.number().int().min(1).max(365) }),
  z.object({ kind: z.literal("custom"), local: z.string().max(40) }),
]);
export type EndChoice = z.infer<typeof endChoice>;

const templateNote = z.object({ name: z.string().max(120), version: z.number().int().positive() });
export type TemplateNote = z.infer<typeof templateNote>;

export const composerExtras = z.object({
  deposit: z.string().max(40),
  limit: z.object({ touched: z.boolean(), text: z.string().max(40) }),
  alertSales: z.string().max(4),
  end: endChoice,
  template: templateNote.nullable(),
});
export type ComposerExtras = z.infer<typeof composerExtras>;

export type ComposerFields = ComposerExtras & {
  readonly productId: string | null;
  readonly terms: StudioTerms;
  readonly inviteOnly: boolean;
  readonly effectiveAt: string;
};

export const blankFields = (alertSales: number): ComposerFields => ({
  productId: null,
  terms: defaultTerms,
  deposit: "",
  limit: { touched: false, text: "" },
  alertSales: String(alertSales),
  end: { kind: "preset", days: 30 },
  template: null,
  inviteOnly: false,
  effectiveAt: "",
});

export const extrasOf = (fields: ComposerFields): ComposerExtras => ({
  deposit: fields.deposit,
  limit: fields.limit,
  alertSales: fields.alertSales,
  end: fields.end,
  template: fields.template,
});

const storageKey = (scope: string, draftId: string) => `spoke-composer:${scope}:${draftId}`;

const storage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const readExtras = (scope: string, draftId: string): ComposerExtras | null => {
  const raw = storage()?.getItem(storageKey(scope, draftId));
  if (!raw) return null;
  const parsed = composerExtras.safeParse(parseJson(raw));
  return parsed.success ? parsed.data : null;
};

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const writeExtras = (scope: string, draftId: string, extras: ComposerExtras) => {
  try {
    storage()?.setItem(storageKey(scope, draftId), JSON.stringify(extras));
  } catch {
    return;
  }
};
