"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { reportDialogCopy } from "./report-copy";
import { kindsFor, maxMessage, type ReportDraft, type ReportTarget } from "./report-input";

type Errors = { kind: string | null; message: string | null; email: string | null };

export function ReportForm({
  draft,
  onChange,
  target,
  errors,
  askEmail,
  details,
}: {
  draft: ReportDraft;
  onChange: (draft: ReportDraft) => void;
  target: ReportTarget | undefined;
  errors: Errors;
  askEmail: boolean;
  details: readonly string[];
}) {
  const kinds = kindsFor(target);
  return (
    <div className="flex flex-col gap-4">
      <Field label={reportDialogCopy.kind} error={errors.kind}>
        <Select
          value={draft.kind ?? undefined}
          placeholder={reportDialogCopy.kindPlaceholder}
          onValueChange={(kind) => {
            onChange({ ...draft, kind });
          }}
          options={kinds.map((kind) => ({ value: kind.value, label: kind.label }))}
        />
      </Field>
      <Field
        label={reportDialogCopy.happened}
        helper={
          <span className="flex justify-between gap-3">
            <span>{reportDialogCopy.happenedHelper}</span>
            <span className="font-mono tabular-nums">
              {fill(reportDialogCopy.counter, { count: formatCount(draft.message.length) })}
            </span>
          </span>
        }
        error={errors.message}
      >
        <Textarea
          rows={5}
          maxLength={maxMessage}
          value={draft.message}
          onChange={(event) => {
            onChange({ ...draft, message: event.target.value });
          }}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Checkbox
          checked={draft.includeDetails}
          onCheckedChange={(includeDetails) => {
            onChange({ ...draft, includeDetails });
          }}
          label={reportDialogCopy.details}
          description={reportDialogCopy.detailsSafe}
        />
        {draft.includeDetails ? (
          <details className="group pl-8">
            <summary className="text-subtle hover:text-ink w-fit cursor-pointer text-sm">
              {reportDialogCopy.detailsShow}
            </summary>
            <ul className="bg-soft text-body mt-2 flex flex-col gap-1 rounded-xl px-3 py-2.5 font-mono text-sm break-all">
              {details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      {askEmail ? (
        <Field label={reportDialogCopy.email} optional error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={draft.email}
            onChange={(event) => {
              onChange({ ...draft, email: event.target.value });
            }}
          />
        </Field>
      ) : (
        <p className="text-subtle text-sm">{reportDialogCopy.replyInApp}</p>
      )}
    </div>
  );
}
