"use client";

import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fill } from "@/lib/copy";
import { formatDateTime, formatTimestampFull } from "@/lib/format";
import { newTermsCopy } from "./copy-launch";
import { reviewCopy } from "./copy-rules";
import { localToMs } from "./derive-rules";
import type { StepKey } from "./fields";
import type { PlainTerm } from "./plain-terms";
import { Fingerprints, ImmutableNote, TermsList, type Prepared } from "./step-review";

const copy = newTermsCopy;

export function NewTermsStep({
  changes,
  terms,
  effectiveAt,
  onEffective,
  effectiveError,
  unchanged,
  showErrors,
  prepared,
  endsAt,
  issue,
  onEdit,
  onRetry,
}: {
  changes: readonly string[];
  terms: readonly PlainTerm[];
  effectiveAt: string;
  onEffective: (local: string) => void;
  effectiveError: string | undefined;
  unchanged: boolean;
  showErrors: boolean;
  prepared: Prepared;
  endsAt: number;
  issue: string | null;
  onEdit: (step: StepKey) => void;
  onRetry: () => void;
}) {
  const effectiveMs = localToMs(effectiveAt);
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
          {copy.changes}
        </h2>
        {changes.length === 0 ? (
          <p
            className={
              showErrors && unchanged ? "text-pink-ink mt-2 text-sm" : "text-subtle mt-2 text-sm"
            }
          >
            {showErrors && unchanged ? copy.errors.unchanged : copy.noChanges}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {changes.map((change) => (
              <li
                key={change}
                className="bg-lilac-soft text-ink rounded-xl px-3 py-2 font-mono text-sm tabular-nums"
              >
                {change}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Field
        label={copy.effective}
        error={showErrors ? effectiveError : undefined}
        helper={
          effectiveMs === null
            ? undefined
            : fill(copy.effectiveHelper, { utc: formatTimestampFull(new Date(effectiveMs)) })
        }
        className="max-w-[360px]"
      >
        <Input
          type="datetime-local"
          value={effectiveAt}
          onChange={(event) => {
            onEffective(event.target.value);
          }}
        />
      </Field>
      <p className="text-body text-sm">
        {fill(copy.keepNote, {
          effectiveAt: effectiveMs === null ? "—" : formatDateTime(new Date(effectiveMs)),
        })}{" "}
        {fill(copy.endsFixed, { date: formatDateTime(new Date(endsAt)) })}
      </p>
      <div className="flex flex-col gap-2">
        <h3 className="text-ink text-base font-medium">{reviewCopy.title}</h3>
        <TermsList terms={terms} onEdit={onEdit} />
      </div>
      <Fingerprints prepared={prepared} onRetry={onRetry} />
      <ImmutableNote />
      {issue ? (
        <p
          role="alert"
          className="bg-pink-soft text-pink-ink flex items-start gap-2 rounded-2xl px-4 py-3 text-sm"
        >
          <HugeiconsIcon
            icon={Alert01Icon}
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
          />
          {issue}
        </p>
      ) : null}
    </Card>
  );
}
