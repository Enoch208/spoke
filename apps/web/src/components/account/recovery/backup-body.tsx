"use client";

import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  FingerPrintIcon,
  PencilEdit01Icon,
  SafeIcon,
  Tick02Icon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId } from "react";
import { Callout } from "@/components/public/shared/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { shortAddress } from "@/lib/format";
import { recoveryCopy } from "../copy/recovery";
import { recoveryWords } from "../shared/phrase";
import { PhraseGrid } from "./phrase-grid";
import type { Backup, BackupFailure, BackupMode } from "./use-backup";

const factIcons = [FingerPrintIcon, SafeIcon, PencilEdit01Icon] as const;

const failureText = (failure: BackupFailure, signedIn: string) => {
  if (failure.kind === "differentAccount")
    return fill(recoveryCopy.failures.differentAccount, {
      address: shortAddress(failure.address),
      signedIn: shortAddress(signedIn),
    });
  return recoveryCopy.failures[failure.kind];
};

function Why({ onboarding }: { onboarding: boolean }) {
  if (onboarding)
    return (
      <ul className="flex flex-col gap-3">
        {recoveryCopy.onboarding.facts.map((fact, index) => (
          <li key={fact} className="flex items-start gap-3">
            <span className="bg-pill text-ink flex size-9 shrink-0 items-center justify-center rounded-xl">
              <HugeiconsIcon
                icon={factIcons[index] ?? SafeIcon}
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
            <p className="text-body pt-1.5">{fact}</p>
          </li>
        ))}
      </ul>
    );
  return (
    <>
      <p className="text-body">{recoveryCopy.why.body}</p>
      <Callout tone="danger">{recoveryCopy.why.danger}</Callout>
      <ul className="flex flex-col gap-2">
        {recoveryCopy.why.checklist.map((item) => (
          <li key={item} className="text-ink flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}

function Check({ backup, mode }: { backup: Backup; mode: BackupMode }) {
  const listId = useId();
  const tooMany = backup.attempts >= 3;
  return (
    <>
      <p className="text-body">{recoveryCopy.check.body}</p>
      <datalist id={listId}>
        {recoveryWords.map((word) => (
          <option key={word} value={word} />
        ))}
      </datalist>
      <div className="grid gap-3 sm:grid-cols-3">
        {backup.positions.map((position, index) => {
          const n = String(position + 1);
          const error = backup.fieldErrors[index];
          return (
            <Field
              key={position}
              label={fill(recoveryCopy.check.label, { n })}
              error={
                error === "empty"
                  ? fill(recoveryCopy.check.empty, { n })
                  : error === "miss"
                    ? fill(recoveryCopy.check.mismatch, { n })
                    : undefined
              }
            >
              <Input
                mono
                list={listId}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={backup.typed[index] ?? ""}
                onChange={(event) => {
                  backup.setTyped(index, event.target.value.toLowerCase().trim());
                }}
              />
            </Field>
          );
        })}
      </div>
      {tooMany ? (
        <Callout tone="caution">
          {mode === "check" ? recoveryCopy.check.stillWrongCheck : recoveryCopy.check.stillWrong}
        </Callout>
      ) : null}
      {mode === "backup" ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          icon={ViewOffIcon}
          onClick={() => {
            backup.restartCheck();
            backup.setStep("write");
          }}
        >
          {recoveryCopy.check.showAgain}
        </Button>
      ) : null}
    </>
  );
}

export function BackupBody({
  backup,
  mode,
  onboarding,
}: {
  backup: Backup;
  mode: BackupMode;
  onboarding: boolean;
}) {
  const failure = backup.failure ? (
    <Callout tone={backup.failure.kind === "cancelled" ? "caution" : "danger"} icon={Alert02Icon}>
      {failureText(backup.failure, backup.me?.address ?? "")}
    </Callout>
  ) : null;
  if (backup.step === "why")
    return (
      <>
        <Why onboarding={onboarding} />
        {failure}
      </>
    );
  if (backup.step === "write")
    return (
      <>
        {backup.demo ? (
          <Badge tone="lilac" className="w-fit">
            {recoveryCopy.write.sample}
          </Badge>
        ) : null}
        <Callout tone="caution">{recoveryCopy.write.caution}</Callout>
        <PhraseGrid words={backup.words} revealed={backup.revealed} />
        <p className="text-subtle text-sm">{recoveryCopy.write.standard}</p>
      </>
    );
  if (backup.step === "check")
    return (
      <>
        <Check backup={backup} mode={mode} />
        {failure}
      </>
    );
  if (backup.step === "skip")
    return (
      <div className="bg-amber-soft flex flex-col gap-1 rounded-2xl px-5 py-4">
        <p className="text-amber-ink font-medium">{recoveryCopy.onboarding.skipTitle}</p>
        <p className="text-body text-sm">{recoveryCopy.onboarding.skipBody}</p>
      </div>
    );
  return (
    <div className="flex flex-col items-start gap-2">
      <StatusChip
        label={recoveryCopy.done.chip}
        icon={CheckmarkCircle02Icon}
        tone="lime"
        size="md"
      />
      <p className="text-body">{recoveryCopy.done.body}</p>
    </div>
  );
}
