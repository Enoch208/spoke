"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { internalPath } from "@/lib/demo/landing";
import { formatPerson } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { recoverCopy } from "../copy/recover";
import { FlowFrame, type FlowArt } from "../flow/flow-frame";
import { flowCopy } from "../flow/copy";
import { ceremonyFailure, type CeremonyFailure } from "../shared/outcome";
import { useSimulatedPrompt } from "../shared/simulated-prompt";
import { ConfirmStep } from "./confirm-step";
import { DoneStep } from "./done-step";
import { PasskeyStep } from "./passkey-step";
import { emptyPhrase, PhraseStep, phraseProblem, phraseReady } from "./phrase-step";
import { useRecovery, type Derived } from "./use-recovery";

type Step = "check" | "phrase" | "confirm" | "passkey" | "done";

const order: readonly Step[] = ["check", "phrase", "confirm", "passkey", "done"];
const art: FlowArt = { tone: "lilac", shape: "block", pieceTone: "lilac" };

export function RecoverPage() {
  const router = useRouter();
  const next = internalPath(useSearchParams().get("next"));
  const { mode } = useClientContext();
  const demo = mode === "demo";
  const signedInAs = useSessionStore((state) =>
    state.status === "signedIn" ? state.address : null,
  );
  const simulated = useSimulatedPrompt();
  const recovery = useRecovery(simulated.ask);
  const [step, setStep] = useState<Step>("check");
  const [words, setWords] = useState<readonly string[]>(emptyPhrase);
  const [pasted, setPasted] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [derived, setDerived] = useState<Derived | null>(null);
  const [passkeyLabel, setPasskeyLabel] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [checkFailure, setCheckFailure] = useState<CeremonyFailure | null>(null);

  const wipe = recovery.forget;
  useEffect(() => wipe, [wipe]);

  const finishPhrase = () => {
    setWords(emptyPhrase());
    recovery.forget();
  };

  const toPhrase = async () => {
    setChecked(true);
    if (phraseProblem(words, pasted) !== null || !phraseReady(words)) return;
    setDerived(await recovery.derive(words));
    setStep("confirm");
  };

  const tryPasskey = async () => {
    setCheckFailure(null);
    if (!demo) {
      useUiStore.getState().open("M-01", { reason: "open", ...(next ? { returnTo: next } : {}) });
      return;
    }
    try {
      await simulated.ask("passkey");
      router.push(next ?? routes.earn.home);
    } catch (failure) {
      setCheckFailure(ceremonyFailure(failure));
    }
  };

  const index = order.indexOf(step);
  const back =
    step === "phrase"
      ? () => {
          setStep("check");
        }
      : step === "confirm"
        ? () => {
            setStep("phrase");
          }
        : undefined;
  const common = {
    id: step,
    steps: recoverCopy.steps,
    current: index,
    art,
    promise: recoverCopy.promise,
    back,
    backLabel: flowCopy.back,
  };

  if (step === "check")
    return (
      <>
        <FlowFrame
          {...common}
          title={recoverCopy.check.title}
          body={recoverCopy.check.body}
          footer={
            <>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setStep("phrase");
                }}
              >
                {recoverCopy.check.usePhrase}
              </Button>
              <Button size="lg" onClick={() => void tryPasskey()}>
                {recoverCopy.check.tryPasskey}
              </Button>
            </>
          }
        >
          {signedInAs ? (
            <Callout tone="info">
              {fill(recoverCopy.signedIn.other, { name: formatPerson({ address: signedInAs }) })}
            </Callout>
          ) : null}
          {checkFailure ? (
            <Callout tone={checkFailure === "prf" ? "danger" : "caution"}>
              {checkFailure === "prf" ? recoverCopy.check.prf : recoverCopy.check.cancelled}
            </Callout>
          ) : null}
          <p className="text-body text-sm">
            {recoverCopy.check.wallet}{" "}
            <button
              type="button"
              className="text-ink font-medium underline-offset-2 hover:underline"
              onClick={() => {
                useUiStore
                  .getState()
                  .open("M-03", { reason: "open", ...(next ? { returnTo: next } : {}) });
              }}
            >
              {recoverCopy.check.walletAction}
            </button>
          </p>
          {demo ? <p className="text-subtle text-sm">{recoverCopy.demo.note}</p> : null}
        </FlowFrame>
        {simulated.element}
      </>
    );

  if (step === "phrase")
    return (
      <FlowFrame
        {...common}
        title={recoverCopy.phrase.title}
        footer={
          <Button size="lg" disabled={!phraseReady(words)} onClick={() => void toPhrase()}>
            {recoverCopy.done.continue}
          </Button>
        }
      >
        <PhraseStep
          words={words}
          onWords={(value) => {
            setWords(value);
            setChecked(false);
          }}
          pasted={pasted}
          onPasted={setPasted}
          demo={demo}
          checked={checked}
        />
      </FlowFrame>
    );

  if (step === "confirm" && derived)
    return (
      <ConfirmStep
        frame={common}
        derived={derived}
        demo={demo}
        signedInAs={signedInAs}
        signIn={recovery.signIn}
        onSignedIn={(created) => {
          setIsNew(created);
          setStep("passkey");
        }}
        onCheckWords={() => {
          setStep("phrase");
        }}
      />
    );

  if (step === "passkey")
    return (
      <>
        <PasskeyStep
          frame={common}
          demo={demo}
          create={() => recovery.addPasskey(words)}
          onDone={(label) => {
            setPasskeyLabel(label);
            finishPhrase();
            setStep("done");
          }}
        />
        {simulated.element}
      </>
    );

  return (
    <DoneStep
      frame={common}
      address={derived?.address ?? ""}
      passkeyLabel={passkeyLabel}
      next={isNew ? routes.welcome : next}
    />
  );
}
