import type { StudioTerms } from "./terms";

export type StudioPrefill = {
  readonly templateId: string;
  readonly name: string | null;
  readonly version: number;
  readonly terms: StudioTerms;
};

let pending: StudioPrefill | null = null;

export const handOffToComposer = (prefill: StudioPrefill) => {
  pending = prefill;
};

export const prefillFor = (templateId: string | null): StudioPrefill | null =>
  templateId !== null && pending?.templateId === templateId ? pending : null;
