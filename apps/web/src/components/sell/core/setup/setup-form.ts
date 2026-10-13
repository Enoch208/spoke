import { fill } from "@/lib/copy";
import { setupCopy } from "../copy/setup";

export type SetupForm = {
  name: string;
  slug: string;
  description: string;
  region: string;
  email: string;
  website: string;
  payout: boolean;
  agreement: boolean;
};

export type SetupErrors = Partial<Record<keyof SetupForm, string>>;

export type SlugCheck = {
  available: boolean;
  reason: "taken" | "reserved" | "invalid" | null;
  suggestion: string | null;
};

export const blankSetup: SetupForm = {
  name: "",
  slug: "",
  description: "",
  region: "",
  email: "",
  website: "",
  payout: false,
  agreement: false,
};

const errors = setupCopy.errors;
const slugPattern = /^[a-z][a-z0-9_]{2,29}$/;

export const slugError = (slug: string, check: SlugCheck | undefined) => {
  if (!slugPattern.test(slug)) return errors.slug;
  if (!check || check.available) return undefined;
  if (check.reason === "reserved") return errors.reserved;
  if (check.reason === "invalid") return errors.slug;
  return check.suggestion
    ? fill(errors.taken, { suggestion: check.suggestion })
    : errors.takenPlain;
};

const httpsUrl = (value: string) => {
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).hostname.includes(".");
  } catch {
    return false;
  }
};

export const stepErrors = (
  step: number,
  form: SetupForm,
  check: SlugCheck | undefined,
): SetupErrors => {
  if (step === 0) {
    const slug = slugError(form.slug, check);
    return {
      ...(form.name.trim().length >= 2 && form.name.trim().length <= 60
        ? {}
        : { name: errors.name }),
      ...(slug ? { slug } : {}),
      ...(form.description.length > 160 ? { description: errors.description } : {}),
      ...(form.region ? {} : { region: errors.region }),
    };
  }
  if (step === 1) {
    const email = form.email.trim();
    return {
      ...(email
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          ? {}
          : { email: errors.email }
        : { email: errors.emailEmpty }),
      ...(form.website.trim() && !httpsUrl(form.website.trim()) ? { website: errors.website } : {}),
      ...(form.payout ? {} : { payout: errors.payout }),
    };
  }
  return form.agreement ? {} : { agreement: errors.agreement };
};

export const slugSeed = (slug: string) => {
  let hash = 7;
  for (let index = 0; index < slug.length; index += 1)
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  return hash;
};
