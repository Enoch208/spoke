"use client";

import {
  Alert02Icon,
  Cancel01Icon,
  Clock01Icon,
  HelpCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/spinner";
import { txSheet, txStepLines, txStepNames } from "@/lib/copy";
import type { TxStep } from "@/lib/tx/types";
import { activeChain } from "@/lib/wagmi";

type Look = {
  line: string;
  icon: IconSvgElement | "spinner" | "index";
  ring: string;
  text: string;
};

const lookFor = (step: TxStep): Look => {
  if (step.skipped)
    return {
      line: txStepLines.skipped,
      icon: Tick02Icon,
      ring: "bg-lime-soft text-lime-deep",
      text: "text-subtle",
    };
  if (step.interrupted)
    return {
      line: txStepLines.interrupted,
      icon: Alert02Icon,
      ring: "bg-amber-soft text-amber-deep",
      text: "text-amber-deep",
    };
  switch (step.status) {
    case "not_submitted":
      return {
        line: txStepLines.not_submitted,
        icon: "index",
        ring: "bg-pill text-subtle",
        text: "text-subtle",
      };
    case "wallet_confirmation":
      return {
        line: txStepLines.wallet_confirmation,
        icon: Clock01Icon,
        ring: "bg-amber-soft text-amber-deep",
        text: "text-amber-deep",
      };
    case "submitted":
    case "included":
    case "confirmed":
      return {
        line: txStepLines[step.status],
        icon: "spinner",
        ring: "bg-sky-soft text-sky-deep",
        text: "text-sky-deep",
      };
    case "indexed":
    case "done":
      return {
        line: txStepLines[step.status],
        icon: Tick02Icon,
        ring: "bg-lime-soft text-lime-deep",
        text: "text-lime-deep",
      };
    case "rejected":
      return {
        line: txStepLines.rejected,
        icon: Cancel01Icon,
        ring: "bg-pill text-subtle",
        text: "text-subtle",
      };
    case "failed":
      return {
        line: txStepLines.failed,
        icon: Cancel01Icon,
        ring: "bg-pink-soft text-pink-deep",
        text: "text-pink-deep",
      };
    case "unknown":
      return {
        line: txStepLines.unknown,
        icon: HelpCircleIcon,
        ring: "bg-amber-soft text-amber-deep",
        text: "text-amber-deep",
      };
    case "replaced":
      return {
        line: txStepLines.replaced,
        icon: Alert02Icon,
        ring: "bg-amber-soft text-amber-deep",
        text: "text-amber-deep",
      };
  }
};

const explorer = activeChain.blockExplorers?.default.url ?? "https://testnet.monadvision.com";

export function StepList({ steps, live }: { steps: readonly TxStep[]; live: boolean }) {
  return (
    <ol aria-label={txSheet.stepsLabel} className="flex flex-col">
      {steps.map((step, index) => {
        const look = lookFor(step);
        const last = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {last ? null : (
              <span
                aria-hidden="true"
                className="bg-hairline absolute top-9 bottom-1 left-[15px] w-px"
              />
            )}
            <span
              className={cx(
                "ease-spring flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors duration-[423ms]",
                look.ring,
              )}
            >
              {look.icon === "spinner" ? (
                <Spinner />
              ) : look.icon === "index" ? (
                index + 1
              ) : (
                <HugeiconsIcon icon={look.icon} size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-ink font-medium">{txStepNames[step.kind]}</span>
                <span className={cx("text-sm", look.text)}>{look.line}</span>
              </div>
              {step.error ? (
                <p role="alert" className="text-pink-deep mt-1 text-sm">
                  {step.error.message}
                </p>
              ) : null}
              {step.hash && live ? (
                <a
                  className="text-subtle hover:text-ink mt-1 inline-block text-sm underline underline-offset-2 transition-colors"
                  target="_blank"
                  rel="noreferrer"
                  href={`${explorer}/tx/${step.hash}`}
                >
                  {txSheet.explorerLink}
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
