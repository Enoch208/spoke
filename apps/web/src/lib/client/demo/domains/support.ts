import { demoId, iso } from "../../../../demo/world/ids";
import type { SupportItem } from "../../../../demo/world/world";
import type { DemoInput, PartialHandlers } from "../handler";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { accountOf } from "./account-store";

type Report = DemoInput<"support.report">;

const reportWords: Record<Report["category"], string> = {
  abuse: "Abuse report",
  fraud: "Fraud report",
  product: "Problem with a product",
  payment: "Payment problem",
  account: "Account problem",
  other: "Report",
};

export const reportSubject = (input: Report): string => {
  const subject = input.subject?.trim();
  if (subject) return subject;
  const target = input.target;
  return target
    ? `${reportWords[input.category]} · ${target.kind} ${target.id}`
    : reportWords[input.category];
};

const file = (runtime: DemoRuntime, subject: string, category: string): { ticketId: string } => {
  const id = demoId("ticket", runtime.nextId("ticket"));
  const now = iso(runtime.now());
  const item: SupportItem = {
    id,
    subject,
    category,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  accountOf(runtime).support.push(item);
  return { ticketId: id };
};

export const supportReads = {
  "support.mine": (_input, runtime) =>
    accountOf(runtime)
      .support.map((item) => ({ ...item }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)),
} satisfies PartialHandlers<"support">;

export const supportWrites = {
  "support.report": (input, runtime) => file(runtime, reportSubject(input), input.category),
  "support.contact": (input, runtime) => file(runtime, input.subject.trim(), "contact"),
} satisfies PartialHandlers<"support">;
