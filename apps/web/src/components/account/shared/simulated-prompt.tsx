"use client";

import { FingerPrintIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { sharedCopy } from "../copy/shared";
import { CeremonyError, type CeremonyFailure } from "./outcome";

export type PromptKind = "passkey" | "wallet";

type Pending = { kind: PromptKind; settle: (failure: CeremonyFailure | null) => void };

export function useSimulatedPrompt() {
  const [pending, setPending] = useState<Pending | null>(null);
  const settled = useRef(false);
  const ask = useCallback(
    (kind: PromptKind) =>
      new Promise<void>((resolve, reject) => {
        settled.current = false;
        setPending({
          kind,
          settle: (failure) => {
            if (settled.current) return;
            settled.current = true;
            setPending(null);
            if (failure) reject(new CeremonyError(failure));
            else resolve();
          },
        });
      }),
    [],
  );
  const element = pending ? <SimulatedPrompt pending={pending} /> : null;
  return { ask, element };
}

function SimulatedPrompt({ pending }: { pending: Pending }) {
  const copy = sharedCopy.simulated[pending.kind];
  return (
    <Dialog
      open
      size="md"
      title={copy.title}
      badge={<Badge tone="lilac">{sharedCopy.demo}</Badge>}
      onOpenChange={(open) => {
        if (!open) pending.settle("cancelled");
      }}
      footer={
        <>
          {pending.kind === "passkey" ? (
            <Button
              variant="ghost"
              onClick={() => {
                pending.settle("prf");
              }}
            >
              {sharedCopy.simulated.passkey.noPrf}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              pending.settle("cancelled");
            }}
          >
            {copy.cancel}
          </Button>
          <Button
            onClick={() => {
              pending.settle(null);
            }}
          >
            {copy.approve}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="bg-lilac-soft text-lilac-deep flex size-10 shrink-0 items-center justify-center rounded-xl">
          <HugeiconsIcon
            icon={pending.kind === "passkey" ? FingerPrintIcon : Wallet01Icon}
            size={20}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>
        <p className="text-body">{copy.body}</p>
      </div>
    </Dialog>
  );
}
