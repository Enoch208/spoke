"use client";

import {
  Alert02Icon,
  Cancel01Icon,
  Clock01Icon,
  HelpCircleIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { TokenLike } from "@/lib/format";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/spinner";
import { toneClasses, type Tone } from "@/components/ui/tone";
import { fill } from "@/lib/copy";
import { formatAmount, formatCount } from "@/lib/format";
import type { TxStep } from "@/lib/tx/types";
import { stepCopy } from "../../copy/steps";

const states = stepCopy.pay.states;

type Look = { line: string; icon: IconSvgElement | "spinner" | "index"; tone: Tone };

const approveLook = (step: TxStep | null, price: string, passkey: boolean): Look => {
  if (!step) return { line: states.upNext, icon: "index", tone: "faint" };
  if (step.skipped) return { line: states.allowedAlready, icon: Tick02Icon, tone: "lime" };
  switch (step.status) {
    case "wallet_confirmation":
      return {
        line: passkey ? states.allowConfirmPasskey : states.allowConfirmWallet,
        icon: Clock01Icon,
        tone: "amber",
      };
    case "submitted":
    case "included":
    case "confirmed":
      return { line: fill(states.allowing, { price }), icon: "spinner", tone: "sky" };
    case "indexed":
    case "done":
      return { line: states.allowed, icon: Tick02Icon, tone: "lime" };
    case "rejected":
      return { line: states.rejected, icon: Cancel01Icon, tone: "faint" };
    case "failed":
      return { line: states.failed, icon: Cancel01Icon, tone: "pink" };
    case "unknown":
      return { line: states.unknown, icon: HelpCircleIcon, tone: "amber" };
    case "replaced":
      return { line: states.rejected, icon: Alert02Icon, tone: "amber" };
    case "not_submitted":
      return { line: states.upNext, icon: "index", tone: "faint" };
  }
};

const purchaseLook = (step: TxStep | null, passkey: boolean, demo: boolean): Look => {
  if (!step) return { line: states.upNext, icon: "index", tone: "faint" };
  switch (step.status) {
    case "wallet_confirmation":
      return {
        line: passkey ? states.payConfirmPasskey : states.payConfirmWallet,
        icon: Clock01Icon,
        tone: "amber",
      };
    case "submitted":
      return { line: states.submitted, icon: "spinner", tone: "sky" };
    case "included":
      return {
        line:
          demo || !step.blockNumber
            ? states.includedDemo
            : fill(states.included, { block: formatCount(BigInt(step.blockNumber)) }),
        icon: "spinner",
        tone: "sky",
      };
    case "confirmed":
      return { line: states.confirmed, icon: Tick02Icon, tone: "lime" };
    case "indexed":
    case "done":
      return { line: states.indexed, icon: Tick02Icon, tone: "lime" };
    case "rejected":
      return { line: states.rejected, icon: Cancel01Icon, tone: "faint" };
    case "failed":
      return { line: states.failed, icon: Cancel01Icon, tone: "pink" };
    case "unknown":
      return { line: states.unknown, icon: HelpCircleIcon, tone: "amber" };
    case "replaced":
      return { line: states.rejected, icon: Alert02Icon, tone: "amber" };
    case "not_submitted":
      return { line: states.upNext, icon: "index", tone: "faint" };
  }
};

function Row({
  index,
  look,
  title,
  help,
}: {
  index: number;
  look: Look;
  title: string;
  help?: string | undefined;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {index === 1 ? (
        <span aria-hidden="true" className="bg-hairline absolute top-9 bottom-1 left-[15px] w-px" />
      ) : null}
      <span
        className={cx(
          "ease-spring flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors duration-[423ms]",
          toneClasses[look.tone].fill,
          toneClasses[look.tone].text,
        )}
      >
        {look.icon === "spinner" ? (
          <Spinner />
        ) : look.icon === "index" ? (
          index
        ) : (
          <HugeiconsIcon icon={look.icon} size={16} strokeWidth={2} aria-hidden="true" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
        <p className="text-ink text-sm font-medium">{title}</p>
        <p className={cx("text-sm", toneClasses[look.tone].text)}>{look.line}</p>
        {help ? <p className="text-subtle text-sm">{help}</p> : null}
      </div>
    </li>
  );
}

export function PayRows({
  approve,
  purchase,
  price,
  token,
  passkey,
  demo,
}: {
  approve: TxStep | null;
  purchase: TxStep | null;
  price: bigint;
  token: TokenLike;
  passkey: boolean;
  demo: boolean;
}) {
  const amount = formatAmount(price, token);
  const approveState = approveLook(approve, amount, passkey);
  const purchaseState = purchaseLook(purchase, passkey, demo);
  return (
    <>
      <ol className="flex flex-col" aria-label={fill(stepCopy.pay.heading, { price: amount })}>
        <Row
          index={1}
          look={approveState}
          title={fill(stepCopy.pay.approve, { price: amount })}
          help={
            approve?.status === "done" || approve?.skipped
              ? undefined
              : fill(stepCopy.pay.approveHelp, { price: amount })
          }
        />
        <Row
          index={2}
          look={purchaseState}
          title={fill(stepCopy.pay.purchase, { price: amount })}
        />
      </ol>
      <p className="sr-only" aria-live="polite">
        {approveState.line} · {purchaseState.line}
      </p>
    </>
  );
}
