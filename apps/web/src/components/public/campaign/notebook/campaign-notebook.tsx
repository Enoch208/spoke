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
  const { note, busy, error, message, open, save, lock, edit } = useNotebook(scope);
  useLeaveGuard(note !== null && note.text !== note.original, "your private campaign notes");
  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-lilac-soft rounded-xl p-2.5">
            <HugeiconsIcon icon={Note01Icon} size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-h4 text-ink font-medium">Private campaign notes</h2>
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
        Your Spoke passkey encrypts these notes separately from your wallet. Only encrypted notes
        are saved on this browser; the text is never sent to Spoke or the blockchain.
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
              {busy ? "Confirm your passkey…" : "Encrypt & save"}
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
        Save before leaving. Notes lock after five minutes or when you leave this campaign. You need
        this browser’s saved data and the same passkey to reopen them. Clearing browser data loses
        the notes; your wallet recovery phrase cannot restore them.
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
