"use client";

import { LockKeyIcon, Note01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLeaveGuard } from "@/components/account/settings/leave-guard";
import type { NoteScope } from "@/lib/campaign-notes/crypto";
import { useClientContext } from "@/lib/client/provider";
import { useSessionStore } from "@/lib/stores/session";
import { useNotebook } from "./use-notebook";

function Notebook({ scope }: { scope: NoteScope }) {
  const {
    note,
    busy,
    error,
    message,
    conflict,
    open,
    save,
    lock,
    edit,
    downloadBackup,
    restoreBackup,
  } = useNotebook(scope);
  useLeaveGuard(note !== null && note.text !== note.original, "your private campaign notes");
  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-5">
      <header
        id="private-notebook"
        className="scroll-mt-24 flex flex-wrap items-start justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="bg-lilac-soft rounded-xl p-2.5">
            <HugeiconsIcon icon={Note01Icon} size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-h4 text-ink font-medium">
              Private partnership notebook
            </h2>
            <p className="text-subtle text-sm">
              Plan your outreach. Keep your working notes private.
            </p>
          </div>
        </div>
        <span className="bg-soft text-body flex items-center gap-1.5 rounded-full px-3 py-1 text-sm">
          <HugeiconsIcon icon={LockKeyIcon} size={15} aria-hidden="true" />
          {note ? "Open on this device" : "Locked"}
        </span>
      </header>
      <p className="text-body text-sm">
        Your Spoke passkey encrypts these notes separately from your wallet. Encrypted copies can
        sync to your private workspace. The text and encryption key never leave this device; Spoke
        stores ciphertext and campaign metadata.
      </p>
      {note ? (
        <>
          <Field label="Campaign notes" helper={`${String(note.text.length)} / 6,000 characters`}>
            <Textarea
              value={note.text}
              onChange={(event) => {
                edit(event.target.value);
              }}
              maxLength={6000}
              rows={6}
              disabled={busy}
              placeholder="Who is this campaign for? What will you share, and when?"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void save()}>
              {busy
                ? "Confirm your passkey…"
                : note.offline
                  ? "Encrypt & save locally"
                  : "Encrypt & sync"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={lock}>
              {note.text === note.original ? "Lock notebook" : "Discard edits & lock"}
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button disabled={busy} onClick={() => void open()}>
            {busy ? "Confirm your passkey…" : "Open private notes"}
          </Button>
        </div>
      )}
      {conflict ? (
        <div role="alert" className="bg-amber-soft space-y-3 rounded-xl p-4 text-sm">
          <p>
            This browser and the synced workspace contain different copies. Download the local
            backup before choosing. Choosing the local copy will replace the synced copy only when
            you save.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => void open("local")}>
              Use local copy
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void open("synced")}>
              Use synced copy
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={busy} onClick={downloadBackup}>
          Download encrypted backup
        </Button>
        {error && !note ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void open("offline")}>
            Open this browser’s saved copy
          </Button>
        ) : null}
      </div>
      {!note ? (
        <label className="text-subtle text-xs">
          Restore an encrypted backup (replaces this device’s saved copy after passkey confirmation)
          <input
            className="border-hairline mt-2 block w-full rounded-lg border p-2 text-xs"
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void restoreBackup(file);
              event.target.value = "";
            }}
          />
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="text-pink-ink text-sm">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-olive text-sm">
          {message}
        </p>
      ) : null}
      <p className="text-subtle border-hairline border-t pt-4 text-xs leading-relaxed">
        Save before leaving. Notes lock after five minutes or when you leave this campaign. A synced
        copy still needs the exact passkey that encrypted it and a browser with PRF support. A
        synced passkey may work across devices; support depends on your provider and has not been
        verified on every device. Device-bound passkeys do not travel. Your wallet recovery phrase
        or a different added passkey cannot decrypt these notes.
      </p>
    </Card>
  );
}

export function CampaignNotebook({ campaignId, chainId }: { campaignId: string; chainId: number }) {
  const { mode } = useClientContext();
  const { address, status, accountKind } = useSessionStore();
  if (mode !== "live" || status !== "signedIn" || accountKind !== "passkey" || !address)
    return null;
  return (
    <Notebook
      key={`${address}:${String(chainId)}:${campaignId}`}
      scope={{ address, chainId, campaignId }}
    />
  );
}
