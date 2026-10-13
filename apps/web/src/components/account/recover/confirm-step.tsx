"use client";

import Link from "next/link";
import { useState } from "react";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { isClientError } from "@/lib/client/errors";
import { fill } from "@/lib/copy";
import { shortAddress } from "@/lib/format";
import { routes } from "@/lib/routes";
import { recoverCopy } from "../copy/recover";
import { FlowFrame } from "../flow/flow-frame";
import { AddressCard } from "./address-card";
import type { Frame } from "./frame";
import type { Derived, SignInResult } from "./use-recovery";

const signInError = (failure: unknown) => {
  if (isClientError(failure) && failure.code === "RATE_LIMITED")
    return recoverCopy.confirm.rateLimited;
  return recoverCopy.confirm.network;
};

export function ConfirmStep({
  frame,
  derived,
  demo,
  signedInAs,
  signIn,
  onSignedIn,
  onCheckWords,
}: {
  frame: Frame;
  derived: Derived;
  demo: boolean;
  signedInAs: string | null;
  signIn: (create: boolean) => Promise<SignInResult>;
  onSignedIn: (created: boolean) => void;
  onCheckWords: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const online = typeof navigator === "undefined" || navigator.onLine;
  const same = !demo && signedInAs?.toLowerCase() === derived.address.toLowerCase();
  const run = async (create: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(create);
      if (result.kind === "noAccount") setNoAccount(true);
      else onSignedIn(result.isNew);
    } catch (failure) {
      setError(signInError(failure));
    } finally {
      setBusy(false);
    }
  };
  const footer = same ? (
    <>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => {
          onSignedIn(false);
        }}
      >
        {recoverCopy.signedIn.setUp}
      </Button>
      <Button asChild size="lg">
        <Link href={routes.earn.home}>{recoverCopy.signedIn.continue}</Link>
      </Button>
    </>
  ) : noAccount ? (
    <>
      <Button variant="secondary" size="lg" disabled={busy} onClick={() => void run(true)}>
        {recoverCopy.confirm.continueAnyway}
      </Button>
      <Button size="lg" onClick={onCheckWords}>
        {recoverCopy.confirm.checkWords}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" size="lg" onClick={onCheckWords}>
        {recoverCopy.confirm.no}
      </Button>
      <Button
        size="lg"
        loading={busy}
        loadingLabel={recoverCopy.confirm.signing}
        disabled={!online}
        {...(online ? {} : { disabledReason: recoverCopy.confirm.offline })}
        onClick={() => void run(false)}
      >
        {recoverCopy.confirm.yes}
      </Button>
    </>
  );
  return (
    <FlowFrame
      {...frame}
      title={recoverCopy.confirm.title}
      body={recoverCopy.confirm.body}
      footer={footer}
    >
      <AddressCard address={derived.address} demo={demo} profile={derived.profile} />
      {same ? <Callout tone="success">{recoverCopy.signedIn.same}</Callout> : null}
      {noAccount ? (
        <Callout
          tone="caution"
          title={fill(recoverCopy.confirm.noAccountTitle, {
            address: shortAddress(derived.address),
          })}
        >
          {recoverCopy.confirm.noAccount}
        </Callout>
      ) : null}
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FlowFrame>
  );
}
