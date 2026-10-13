import type { ClientInput } from "@spoke/protocol";
import { z } from "zod";
import type { ReportContext } from "@/lib/stores/modal-props";
import { moderationKinds, problemKinds, reportDialogCopy } from "./report-copy";

export type ReportTarget = NonNullable<ClientInput<"support.report">["target"]> & { name: string };

export type ReportDraft = {
  kind: string | null;
  message: string;
  email: string;
  includeDetails: boolean;
};

export const minMessage = 20;
export const maxMessage = 2000;

const email = z.email();

export const kindsFor = (target: ReportTarget | undefined) =>
  target ? moderationKinds : problemKinds;

export const draftErrors = (draft: ReportDraft, askEmail: boolean) => {
  const length = draft.message.trim().length;
  return {
    kind: draft.kind ? null : reportDialogCopy.errors.kind,
    message:
      length < minMessage
        ? reportDialogCopy.errors.short
        : length > maxMessage
          ? reportDialogCopy.errors.long
          : null,
    email:
      askEmail && draft.email.trim() && !email.safeParse(draft.email.trim()).success
        ? reportDialogCopy.errors.email
        : null,
  };
};

const flatten = (value: string | readonly string[]) =>
  typeof value === "string" ? value : value.join(", ");

export const detailLines = (facts: Readonly<Record<string, string>>, context: ReportContext) => [
  ...Object.entries(facts).map(([label, value]) => `${label}: ${value}`),
  ...Object.entries(context).map(([key, value]) => `${key}: ${flatten(value)}`),
];

const targetContext = (target: ReportTarget | undefined) => {
  if (!target) return {};
  if (target.kind === "campaign") return { campaignId: target.id };
  if (target.kind === "link") return { nodeId: target.id };
  if (target.kind === "sale") return { saleId: target.id };
  if (target.kind === "merchant") return { merchantId: target.id };
  return {};
};

export const reportInput = ({
  draft,
  target,
  page,
  details,
  askEmail,
}: {
  draft: ReportDraft;
  target: ReportTarget | undefined;
  page: string;
  details: readonly string[];
  askEmail: boolean;
}): ClientInput<"support.report"> => {
  const kind = kindsFor(target).find((item) => item.value === draft.kind) ?? kindsFor(target)[0];
  const body = draft.message.trim();
  const message = draft.includeDetails
    ? `${body}\n\n${reportDialogCopy.technical}\n${details.join("\n")}`
    : body;
  const reply = draft.email.trim();
  return {
    subject: kind.label,
    category: kind.category,
    message: message.slice(0, 5000),
    ...(askEmail && reply ? { email: reply } : {}),
    context: { page, ...targetContext(target) },
    ...(target ? { target: { kind: target.kind, id: target.id } } : {}),
  };
};
