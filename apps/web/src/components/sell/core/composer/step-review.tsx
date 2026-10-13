"use client";

import { Alert01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyField } from "@/components/ui/copy-field";
import { Skeleton } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";
import { composerCopy } from "./copy";
import { reviewCopy } from "./copy-rules";
import type { StepKey } from "./fields";
import type { PlainTerm } from "./plain-terms";

const copy = reviewCopy;

export type Prepared =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly policyHash: string;
      readonly metadataHash: string;
      readonly version: number;
    }
  | { readonly status: "error"; readonly message: string };

export type StepIssue = { readonly step: StepKey; readonly count: number };

export function FixList({
  issues,
  onEdit,
}: {
  issues: readonly StepIssue[];
  onEdit: (step: StepKey) => void;
}) {
  const total = issues.reduce((sum, issue) => sum + issue.count, 0);
  if (total === 0) return null;
  return (
    <div
      role="alert"
      className="bg-pink-soft text-pink-ink flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm"
    >
      <p className="flex items-center gap-2 font-medium">
        <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />
        {total === 1 ? copy.fixOne : fill(copy.fix, { count: String(total) })}
      </p>
      <ul className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <li key={issue.step}>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onEdit(issue.step);
              }}
            >
              {`${composerCopy.steps[issue.step]} · ${String(issue.count)}`}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TermsList({
  terms,
  onEdit,
}: {
  terms: readonly PlainTerm[];
  onEdit: (step: StepKey) => void;
}) {
  return (
    <ol className="flex flex-col">
      {terms.map((term, index) => (
        <li
          key={term.text}
          className="border-hairline flex items-start gap-3 border-t py-3 first:border-t-0 first:pt-0"
        >
          <span className="text-faint w-6 shrink-0 font-mono text-sm tabular-nums">
            {index + 1}
          </span>
          <span className="text-ink min-w-0 flex-1 text-sm">{term.text}</span>
          {term.step ? (
            <Button
              variant="ghost"
              size="sm"
              className="-my-1"
              onClick={() => {
                if (term.step) onEdit(term.step);
              }}
            >
              {copy.edit}
            </Button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function Fingerprints({ prepared, onRetry }: { prepared: Prepared; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-ink text-base font-medium">{copy.fingerprints}</h3>
      {prepared.status === "loading" ? (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">{copy.preparing}</span>
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : prepared.status === "error" ? (
        <div className="bg-pink-soft text-pink-ink flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm">
          <span>{fill(copy.prepareFailed, { reason: prepared.message })}</span>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {copy.retry}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-subtle text-sm">{copy.policyHash}</p>
            <CopyField
              value={prepared.policyHash}
              label={copy.policyHash}
              copiedMessage={copy.copied}
            />
            <p className="text-subtle text-xs">{copy.policyHashHelper}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-subtle text-sm">{copy.productHash}</p>
            <CopyField
              value={prepared.metadataHash}
              label={copy.productHash}
              copiedMessage={copy.copiedProduct}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function ImmutableNote() {
  return (
    <p className="bg-amber-soft text-amber-ink flex items-start gap-2 rounded-2xl px-4 py-3 text-sm">
      <HugeiconsIcon icon={LockIcon} size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
      {copy.immutable}
    </p>
  );
}

export function ReviewStep({
  terms,
  issues,
  prepared,
  confirmed,
  onConfirm,
  showErrors,
  needsBackup,
  onEdit,
  onRetry,
}: {
  terms: readonly PlainTerm[];
  issues: readonly StepIssue[];
  prepared: Prepared;
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
  showErrors: boolean;
  needsBackup: boolean;
  onEdit: (step: StepKey) => void;
  onRetry: () => void;
}) {
  const open = useUiStore((state) => state.open);
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
          {copy.title}
        </h2>
        <p className="text-subtle mt-1 text-sm">{copy.description}</p>
      </div>
      <FixList issues={issues} onEdit={onEdit} />
      <TermsList terms={terms} onEdit={onEdit} />
      <Fingerprints prepared={prepared} onRetry={onRetry} />
      <ImmutableNote />
      {needsBackup ? (
        <div className="bg-sky-soft text-sky-ink flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm">
          <span>{copy.backup}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              open("M-04", { mode: "backup", origin: "settings" });
            }}
          >
            {copy.backupNow}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Checkbox checked={confirmed} onCheckedChange={onConfirm} label={copy.confirm} />
        {showErrors && !confirmed ? (
          <p role="alert" className="text-pink-ink pl-8 text-sm">
            {copy.confirmError}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
