"use client";

import Link from "next/link";
import { useState } from "react";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { isClientError } from "@/lib/client/errors";
import { routes } from "@/lib/routes";
import { recoverCopy } from "../copy/recover";
import { sharedCopy } from "../copy/shared";
import { FlowFrame } from "../flow/flow-frame";
import { ceremonyFailure, type CeremonyFailure } from "../shared/outcome";
import type { Frame } from "./frame";

const passkeyMessage = (failure: CeremonyFailure | "vault") => {
  if (failure === "vault") return recoverCopy.passkey.vaultFailed;
  if (failure === "prf") return `${sharedCopy.ceremony.prf} ${sharedCopy.ceremony.prfOrphan}`;
  if (failure === "crypto") return recoverCopy.passkey.unsupported;
  return recoverCopy.passkey.cancelled;
};

export function PasskeyStep({
  frame,
  demo,
  create,
  onDone,
}: {
  frame: Frame;
  demo: boolean;
  create: () => Promise<string>;
  onDone: (label: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CeremonyFailure | "vault" | null>(null);
  const supported = demo || (typeof window !== "undefined" && "PublicKeyCredential" in window);
  const local = !demo && typeof location !== "undefined" && location.hostname === "localhost";
  const run = async () => {
    setBusy(true);
    setFailure(null);
    try {
      onDone(await create());
    } catch (error) {
      setFailure(isClientError(error) ? "vault" : ceremonyFailure(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <FlowFrame
      {...frame}
      title={recoverCopy.passkey.title}
      body={supported ? recoverCopy.passkey.body : recoverCopy.passkey.unsupported}
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            disabled={busy}
            onClick={() => {
              onDone(null);
            }}
          >
            {recoverCopy.passkey.notNow}
          </Button>
          {supported ? (
            <Button
              size="lg"
              loading={busy}
              loadingLabel={recoverCopy.passkey.creating}
              onClick={() => void run()}
            >
              {failure ? sharedCopy.tryAgain : recoverCopy.passkey.create}
            </Button>
          ) : null}
        </>
      }
    >
      {supported ? (
        <p className="text-subtle text-sm">
          {recoverCopy.passkey.hint}
          {local ? ` ${recoverCopy.passkey.devHint}` : ""}
        </p>
      ) : (
        <Link
          href={routes.support}
          className="text-ink text-sm font-medium underline-offset-2 hover:underline"
        >
          {recoverCopy.passkey.supported}
        </Link>
      )}
      <p className="text-subtle text-sm">{recoverCopy.passkey.notNowNote}</p>
      {failure ? (
        <Callout tone={failure === "cancelled" ? "caution" : "danger"}>
          {passkeyMessage(failure)}
        </Callout>
      ) : null}
    </FlowFrame>
  );
}
