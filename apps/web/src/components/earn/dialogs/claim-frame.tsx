"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ModeBadge } from "@/components/ui/mode-badge";
import { useClientContext } from "@/lib/client/provider";
import { common, fill } from "@/lib/copy";
import { shortAddress } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { claimDialog, fundsNotice } from "../copy/settlement";
import { FeeLine } from "../shared/fee-line";
import { useViewerAddress } from "../shared/viewer";

export type ClaimLine = { key: string; label: ReactNode; amount: string };

export function ClaimFrame({
  title,
  isTop,
  close,
  primaryRef,
  amount,
  lines,
  notes,
  nothing,
  pendingHref,
  notice,
  needsFunds,
  primary,
  children,
}: {
  title: string;
  isTop: boolean;
  close: () => void;
  primaryRef: RefObject<HTMLButtonElement | null>;
  amount: ReactNode;
  lines: readonly ClaimLine[];
  notes: readonly string[];
  nothing: string | null;
  pendingHref: string;
  notice: string | null;
  needsFunds: boolean;
  primary: ReactNode;
  children?: ReactNode;
}) {
  const { mode } = useClientContext();
  const viewer = useViewerAddress();
  const open = useUiStore((state) => state.open);
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="md"
      inert={!isTop}
      initialFocus={primaryRef}
      title={title}
      badge={<ModeBadge mode={mode} />}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {common.cancel}
          </Button>
          {nothing ? null : needsFunds ? (
            <Button ref={primaryRef} onClick={() => open("M-06", { context: title })}>
              {fundsNotice.action}
            </Button>
          ) : (
            primary
          )}
        </>
      }
    >
      <div className="grid gap-5">
        <p className="text-ink font-mono text-[28px] leading-tight tabular-nums">{amount}</p>
        {nothing ? (
          <p className="text-body">
            {nothing}{" "}
            <Link
              href={pendingHref}
              onClick={close}
              className="text-ink underline underline-offset-2"
            >
              {claimDialog.seePending}
            </Link>
          </p>
        ) : null}
        {lines.length > 0 ? (
          <ul
            aria-label={claimDialog.byCampaign}
            className="bg-soft divide-hairline divide-y rounded-xl px-4"
          >
            {lines.map((line) => (
              <li key={line.key} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-body min-w-0">{line.label}</span>
                <span className="text-ink font-mono tabular-nums">{line.amount}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {children}
        {notice ? (
          <p role="status" className="bg-amber-soft text-amber-ink rounded-xl px-4 py-3 text-sm">
            {notice}
          </p>
        ) : null}
        {needsFunds ? <p className="text-amber-ink text-sm">{fundsNotice.line}</p> : null}
        {viewer ? (
          <p className="text-body text-sm">
            {fill(claimDialog.sentTo, { address: shortAddress(viewer) })}
          </p>
        ) : null}
        {notes.map((note) => (
          <p key={note} className="text-subtle text-sm">
            {note}
          </p>
        ))}
        {nothing ? null : <FeeLine />}
      </div>
    </Dialog>
  );
}
