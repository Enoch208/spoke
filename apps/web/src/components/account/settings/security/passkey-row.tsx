"use client";

import {
  Alert02Icon,
  FingerPrintIcon,
  InformationCircleIcon,
  SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ClientOutput } from "@spoke/protocol";
import { useState } from "react";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip } from "@/components/ui/tooltip";
import { fill } from "@/lib/copy";
import { formatRelative, shortAddress } from "@/lib/format";
import { securityCopy } from "../../copy/security";
import { formatDay } from "../../shared/dates";
import { errorText } from "../../shared/error-text";

type Passkey = ClientOutput<"account.passkeys">[number];

const copy = securityCopy.passkeys;

export function PasskeyRow({
  passkey,
  address,
  thisDevice,
  now,
  removeBlocked,
  onRename,
  onRemove,
}: {
  passkey: Passkey;
  address: string;
  thisDevice: boolean;
  now: number;
  removeBlocked: boolean;
  onRename: (label: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(passkey.label);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missingVault = passkey.kind === "added" && !passkey.hasVault;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setEditing(false);
      setConfirming(false);
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <span className="bg-pill text-ink flex size-10 shrink-0 items-center justify-center rounded-xl">
          <HugeiconsIcon
            icon={passkey.kind === "original" ? FingerPrintIcon : SmartPhone01Icon}
            size={20}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ink font-medium break-words">{passkey.label}</p>
            {thisDevice ? (
              <StatusChip label={copy.thisDevice} icon={SmartPhone01Icon} tone="sky" />
            ) : null}
            {missingVault ? (
              <StatusChip label={copy.cantUnlock} icon={Alert02Icon} tone="pink" />
            ) : null}
          </div>
          <p className="text-body text-sm">
            {passkey.kind === "original" ? copy.original : copy.added}
          </p>
          <p className="text-subtle text-sm">
            {fill(copy.created, {
              date: formatDay(new Date(passkey.createdAt)),
              device: passkey.deviceHint,
            })}
            {" · "}
            {passkey.lastUsedAt
              ? fill(copy.lastUsed, {
                  time: formatRelative(new Date(passkey.lastUsedAt), { now: new Date(now) }),
                })
              : copy.neverUsed}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {editing ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(true);
              }}
            >
              {copy.rename}
            </Button>
          )}
          {passkey.kind === "original" ? (
            <Tooltip content={fill(copy.originalTip, { address: shortAddress(address) })}>
              <button
                type="button"
                aria-label={copy.originalInfo}
                className="text-subtle hover:text-ink flex size-8 items-center justify-center rounded-full"
              >
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </button>
            </Tooltip>
          ) : confirming ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="text-pink-ink"
              disabled={removeBlocked}
              {...(removeBlocked ? { disabledReason: copy.removeBlocked } : {})}
              onClick={() => {
                setConfirming(true);
              }}
            >
              {copy.remove}
            </Button>
          )}
        </div>
      </div>
      {missingVault ? <Callout tone="danger">{copy.cantUnlockBody}</Callout> : null}
      {error ? (
        <p role="alert" className="text-pink-ink text-sm">
          {error}
        </p>
      ) : null}
      {editing ? (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (label.trim()) void run(() => onRename(label.trim()));
          }}
        >
          <Field label={copy.renameLabel} className="flex-1">
            <Input
              value={label}
              maxLength={80}
              autoFocus
              onChange={(event) => {
                setLabel(event.target.value);
              }}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setLabel(passkey.label);
              }}
            >
              {copy.cancel}
            </Button>
            <Button type="submit" loading={busy} disabled={!label.trim()}>
              {copy.save}
            </Button>
          </div>
        </form>
      ) : null}
      {confirming ? (
        <Callout
          tone="caution"
          actions={
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setConfirming(false);
                }}
              >
                {copy.cancel}
              </Button>
              <Button size="sm" variant="danger" loading={busy} onClick={() => void run(onRemove)}>
                {copy.remove}
              </Button>
            </>
          }
        >
          {fill(copy.removeConfirm, { label: passkey.label })}
        </Callout>
      ) : null}
    </li>
  );
}
