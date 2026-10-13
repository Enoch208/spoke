"use client";

import { explorerTxUrl } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import { formatAmount, formatMonFee } from "@/lib/format";
import { useSessionStore } from "@/lib/stores/session";
import type { TxError, TxStep } from "@/lib/tx/types";
import { activeChain } from "@/lib/wagmi";
import { blockedCopy } from "../../copy/blocked";
import { stepCopy } from "../../copy/steps";
import { blockedByError } from "../model";
import type { Checkout } from "../use-checkout";
import { PayRows } from "./pay-rows";

const copy = stepCopy.pay;

const chargeLine = (error: TxError) =>
  error.phase === "mined" && error.feePaidWei
    ? fill(copy.feeUsed, { fee: formatMonFee(BigInt(error.feePaidWei)) })
    : copy.nothingCharged;

const failureLines = (
  step: TxStep,
  approve: TxStep | null,
  price: string,
  symbol: string,
): string[] => {
  const approved = approve?.status === "done" && !approve.skipped && step.kind === "purchase";
  const still = approved ? [fill(copy.approvalStillSet, { price })] : [];
  if (step.status === "rejected")
    return [step.kind === "approve" ? copy.approvalRejected : copy.purchaseRejected, ...still];
  if (step.status === "replaced") return [copy.purchaseRejected, ...still];
  const error = step.error;
  if (!error) return [copy.didntGoThrough, copy.nothingCharged];
  if (error.contractError === "ERC20InsufficientAllowance")
    return [fill(copy.allowanceRace, { price })];
  if (error.contractError === "ERC20InsufficientBalance")
    return [fill(copy.balanceDropped, { price, symbol }), chargeLine(error)];
  const blocked = blockedByError(error.code, error.contractError);
  const body = blocked ? blockedCopy[blocked].body : copy.didntGoThrough;
  return [body, chargeLine(error), ...still];
};

export function PayStep({ checkout }: { checkout: Checkout }) {
  const passkey = useSessionStore((state) => state.accountKind === "passkey");
  const campaign = checkout.campaign.data;
  if (!campaign) return null;
  const record = checkout.record;
  const approve = record?.steps.find((step) => step.kind === "approve") ?? null;
  const purchase = record?.steps.find((step) => step.kind === "purchase") ?? null;
  const demo = checkout.mode === "demo";
  const price = formatAmount(checkout.price, campaign.token);
  const stopped = record?.steps.find(
    (step) => step.status === "rejected" || step.status === "failed" || step.status === "replaced",
  );
  const hash = purchase?.hash ?? null;
  const explorer = hash && !demo ? explorerTxUrl(activeChain.id, hash) : null;
  const slow =
    purchase?.status === "submitted" &&
    purchase.submittedAt !== null &&
    checkout.now - purchase.submittedAt > 30_000;
  return (
    <div className="flex flex-col gap-4">
      <PayRows
        approve={approve}
        purchase={purchase}
        price={checkout.price}
        token={campaign.token}
        passkey={passkey}
        demo={demo}
      />
      {stopped ? (
        <div
          role="alert"
          className="bg-pink-soft text-pink-ink flex flex-col gap-1 rounded-xl p-3 text-sm"
        >
          {failureLines(stopped, approve, price, campaign.token.symbol).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
      {checkout.view.kind === "confirming" && checkout.view.unknown ? (
        <div className="bg-amber-soft text-amber-ink flex flex-col gap-1 rounded-xl p-3 text-sm">
          <p>{copy.lostContact}</p>
          <p>{copy.twiceCaption}</p>
        </div>
      ) : null}
      {slow ? <p className="text-body text-sm">{copy.slow}</p> : null}
      {explorer ? (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="text-ink self-start text-sm font-medium underline underline-offset-2"
        >
          {copy.viewTransaction}
        </a>
      ) : null}
      <div className="text-subtle flex flex-col gap-1 text-sm">
        <p>{copy.fee}</p>
        <p>{copy.simulate}</p>
      </div>
    </div>
  );
}
