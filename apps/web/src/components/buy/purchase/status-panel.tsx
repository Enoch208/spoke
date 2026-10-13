"use client";

import type { ClientOutput } from "@spoke/protocol";
import type { ReactNode } from "react";
import { PanelBackdrop } from "@/components/landing/panel-backdrop";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fill } from "@/lib/copy";
import { formatAmount, formatCountdown, formatDateTime } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { purchaseCopy } from "../copy/purchase";
import { TxLink } from "./tx-link";

type Receipt = ClientOutput<"receipts.get">;

const copy = purchaseCopy.detail;
const hour = 3600;
const lastMinutes = 300;

const countdownText = (seconds: number) => {
  if (seconds >= hour) return formatCountdown(seconds);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

function Frame({ tone, children }: { tone: "amber" | "lime" | "pink"; children: ReactNode }) {
  if (tone === "amber")
    return (
      <section className="bg-amber-soft flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
        {children}
      </section>
    );
  return (
    <section className="relative overflow-hidden rounded-2xl">
      <PanelBackdrop tone={tone} />
      <div className="relative flex flex-col gap-3 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function StatusPanel({
  receipt,
  now,
  demo,
}: {
  receipt: Receipt;
  now: number;
  demo: boolean;
}) {
  const unlock = Date.parse(receipt.unlockAt);
  const unlockTime = formatDateTime(new Date(unlock), { now: new Date(now) });
  const price = formatAmount(BigInt(receipt.price), receipt.token, { testnet: true });
  if (receipt.state === "REFUNDED") {
    const at = receipt.refundTx?.at;
    return (
      <Frame tone="pink">
        <p className="text-ink">
          {fill(copy.refundedBody, { price, time: at ? formatDateTime(new Date(at)) : unlockTime })}
        </p>
        <p className="text-body text-sm">{copy.refundedRequired}</p>
        <TxLink tx={receipt.refundTx} demo={demo} label={copy.viewRefund} />
      </Frame>
    );
  }
  if (receipt.state === "FINALIZED") {
    const at = receipt.finalizeTx?.at ?? receipt.unlockAt;
    return (
      <Frame tone="lime">
        <p className="text-ink">{fill(copy.settledBody, { time: formatDateTime(new Date(at)) })}</p>
        <TxLink tx={receipt.finalizeTx} demo={demo} label={copy.viewFinalize} />
      </Frame>
    );
  }
  const remaining = Math.max(0, Math.floor((unlock - now) / 1000));
  if (remaining === 0)
    return (
      <Frame tone="amber">
        <p role="status" className="text-ink">
          {fill(copy.holdEndedBody, { unlockTime })}
        </p>
      </Frame>
    );
  const purchased = Date.parse(receipt.purchasedAt);
  const total = Math.max(1, unlock - purchased);
  const elapsed = Math.min(total, Math.max(0, now - purchased));
  const requested = receipt.refundRequest ?? null;
  return (
    <Frame tone="amber">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className="text-ink text-h3 font-mono leading-none tabular-nums" aria-hidden="true">
          {countdownText(remaining)}
        </p>
        <p className="text-body pb-1 text-sm">
          {copy.countdownLabel} · {unlockTime}
        </p>
      </div>
      <ProgressBar
        value={elapsed}
        max={total}
        tone="amber"
        label={copy.holdProgress}
        valueText={`${String(Math.round((elapsed / total) * 100))}%`}
      />
      <p className="text-ink">{fill(copy.pendingBody, { unlockTime })}</p>
      {requested ? (
        <p className="text-body text-sm">
          {fill(copy.refundRequested, { time: formatDateTime(new Date(requested.createdAt)) })}
        </p>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              useUiStore.getState().open("M-19", { saleId: receipt.saleId });
            }}
          >
            {copy.askRefund}
          </Button>
          {remaining <= lastMinutes ? (
            <p className="text-amber-ink text-sm">{fill(copy.lastMinutes, { unlockTime })}</p>
          ) : null}
        </div>
      )}
    </Frame>
  );
}
