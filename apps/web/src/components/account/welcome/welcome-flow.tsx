"use client";

import type { ClientOutput } from "@spoke/protocol";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { welcomeCopy as copy } from "../copy/welcome";
import { FlowFrame, type FlowArt } from "../flow/flow-frame";
import { WelcomeDone } from "./done-step";
import { WelcomeFunding } from "./funding-step";
import { IntentStep } from "./intent-step";
import { WelcomeProfile } from "./profile-step";
import { WelcomeRecovery } from "./recovery-step";
import { useWelcome } from "./use-welcome";

const art: readonly FlowArt[] = [
  { tone: "lime", shape: "lime" },
  { tone: "lilac", shape: "block" },
  { tone: "pink", shape: "pink" },
  { tone: "sky", shape: "olive" },
  { tone: "lime", shape: "lime" },
];

export function WelcomeFlow({ me }: { me: ClientOutput<"account.me"> }) {
  const flow = useWelcome(me);
  const step = flow.step;
  if (step === 2) return <WelcomeRecovery flow={flow} />;
  return (
    <FlowFrame
      id={`welcome-${String(step)}`}
      steps={flow.steps}
      current={flow.index}
      art={art[step] ?? { tone: "lime", shape: "lime" }}
      promise={copy.promises[step] ?? ""}
      title={copy.titles[step] ?? ""}
      body={copy.bodies[step]}
      back={step > 0 && step < 4 ? flow.back : undefined}
      backLabel={copy.back}
      chip={flow.demo ? <Badge tone="lilac">{copy.sample}</Badge> : undefined}
      footer={
        step === 2 ? undefined : step === 4 ? (
          <Button size="lg" onClick={flow.finish}>
            {flow.destination?.action ?? copy.continue}
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              loading={flow.pending}
              disabled={flow.blocked}
              onClick={() => void flow.continueStep()}
            >
              {step === 3 ? copy.withoutFunds : copy.continue}
            </Button>
            {step === 1 ? (
              <Button
                variant="ghost"
                onClick={() => {
                  flow.setStep(flow.recovery ? 2 : 3);
                }}
              >
                {copy.skip}
              </Button>
            ) : null}
          </>
        )
      }
    >
      {flow.demo ? <p className="text-subtle text-sm">{copy.sampleHelp}</p> : null}
      {step === 0 ? <IntentStep value={flow.intent} onChange={flow.setIntent} /> : null}
      {step === 1 ? <WelcomeProfile flow={flow} /> : null}
      {step === 3 ? (
        <>
          <p className="text-body text-sm">
            {flow.intent === "earn"
              ? copy.earnFunds
              : flow.intent === "sell"
                ? copy.sellFunds
                : flow.intent === "build"
                  ? copy.buildNote
                  : copy.buyFunds}
          </p>
          <WelcomeFunding demo={flow.demo} />
        </>
      ) : null}
      {step === 4 ? <WelcomeDone flow={flow} /> : null}
      {flow.error ? (
        <p role="alert" className="text-pink-ink text-sm">
          {copy.saveFailed} {flow.error}
        </p>
      ) : null}
    </FlowFrame>
  );
}
