"use client";

import { useEffect, useRef } from "react";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { stepCopy } from "../../copy/steps";
import { stepperIndex, type CheckoutPhase } from "../model";
import type { Checkout } from "../use-checkout";
import { BlockedNotice } from "./blocked-notice";
import { CheckoutStepper } from "./checkout-stepper";
import { DonePanel } from "./done-panel";
import { FundsStep } from "./funds-step";
import { PayStep } from "./pay-step";
import { ReviewStep } from "./review-step";

const headingFor = (phase: CheckoutPhase, price: string) => {
  if (phase === "review") return stepCopy.review.heading;
  if (phase === "account") return stepCopy.account.heading;
  if (phase === "funds") return stepCopy.funds.heading;
  return fill(stepCopy.pay.heading, { price });
};

const noticeText = {
  termsChanged: stepCopy.pay.termsChanged,
  apiDown: stepCopy.pay.apiDown,
  stillChecking: stepCopy.pay.stillChecking,
} as const;

export function CheckoutPanel({
  checkout,
  onDirect,
}: {
  checkout: Checkout;
  onDirect: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const firstPhase = useRef(checkout.phase);
  const campaign = checkout.campaign.data;
  const { phase, blocked } = checkout;
  useEffect(() => {
    if (phase === firstPhase.current) return;
    firstPhase.current = phase;
    heading.current?.focus();
  }, [phase]);
  if (!campaign) return null;
  const price = formatAmount(checkout.price, campaign.token);
  return (
    <div className="flex flex-col gap-5">
      <CheckoutStepper current={stepperIndex[phase]} />
      {phase === "done" ? (
        <DonePanel checkout={checkout} />
      ) : (
        <>
          <h2
            ref={heading}
            tabIndex={-1}
            className="font-display text-h4 text-ink font-medium tracking-[-0.01em] outline-none"
          >
            {headingFor(phase, price)}
          </h2>
          {checkout.notice ? (
            <p role="status" className="bg-sky-soft text-sky-ink rounded-xl p-3 text-sm">
              {noticeText[checkout.notice]}
            </p>
          ) : null}
          {blocked ? (
            <BlockedNotice checkout={checkout} blocked={blocked} onDirect={onDirect} />
          ) : null}
          {blocked && phase !== "pay" ? null : phase === "review" ? (
            <ReviewStep checkout={checkout} />
          ) : phase === "account" ? (
            <div className="flex flex-col gap-2">
              <p className="text-body">{stepCopy.account.body}</p>
              <p className="text-subtle text-sm">{stepCopy.account.small}</p>
            </div>
          ) : phase === "funds" ? (
            <FundsStep checkout={checkout} />
          ) : (
            <PayStep checkout={checkout} />
          )}
        </>
      )}
    </div>
  );
}
