import type { TermsCheck } from "../studio/validate";
import { stepErrors } from "./copy-errors";
import type { ComposerFields, EndChoice } from "./fields";

const hour = 3_600_000;
const day = 24 * hour;

export type RulesErrors = { readonly end: string | undefined; readonly hold: string | undefined };

export const localToMs = (local: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const value = new Date(local).getTime();
  return Number.isNaN(value) ? null : value;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const msToLocal = (ms: number) => {
  const date = new Date(ms);
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const endsAtOf = (end: EndChoice, now: number): number | null =>
  end.kind === "preset" ? now + end.days * day : localToMs(end.local);

export const endError = (end: EndChoice, now: number) => {
  if (end.kind === "preset") return undefined;
  const at = localToMs(end.local);
  if (at === null) return stepErrors.rules.endInvalid;
  if (at < now + hour) return stepErrors.rules.endSoon;
  return at > now + 365 * day ? stepErrors.rules.endFar : undefined;
};

export const rulesErrors = (
  fields: ComposerFields,
  check: TermsCheck,
  now: number,
): RulesErrors => ({
  end: endError(fields.end, now),
  hold: check.errors.hold,
});
