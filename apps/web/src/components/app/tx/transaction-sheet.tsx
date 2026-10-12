"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { ModalComponentProps } from "../modal-types";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus, totalFeePaid } from "@/lib/tx/records";
import { txLabel } from "@/lib/tx/labels";
import { formatMonFee } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { useTxEngine } from "./tx-provider";

const statusLabels = {
  checking: "Checking",
  queued: "Waiting for another action",
  interrupted: "Ready to continue",
  needs_confirmation: "Confirm in your wallet",
  running: "Waiting for confirmation",
  syncing: "Confirmed · syncing activity",
  done: "Done",
  already_done: "Already done",
  rejected: "Request declined",
  failed: "Action failed",
  unknown: "Still checking the transaction",
  replaced: "Transaction replaced",
  expired: "Action expired",
};

export default function TransactionSheet({ props, close }: ModalComponentProps<"M-11">) {
  const records = useTxStore((state) => state.records);
  const engine = useTxEngine();
  const record = "txId" in props ? records.find((candidate) => candidate.id === props.txId) : null;
  const status = record ? overallStatus(record) : null;
  const finished = status === "done" || status === "already_done";
  const saleId = record?.context.saleId;
  const campaignId = record?.context.campaignId;
  const nodeId = record?.context.nodeId;
  return (
    <Sheet
      placement="transaction"
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={record ? txLabel(record) : "Your transactions"}
      subtitle={record?.mode === "demo" ? "Sample transaction · demo" : "Monad Testnet"}
      footer={
        record ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                engine.hide(record.id);
                close();
              }}
            >
              {finished ? "Close" : "Hide"}
            </Button>
            {status === "failed" || status === "rejected" || status === "replaced" ? (
              <Button
                onClick={() => {
                  engine.retry(record.id);
                }}
              >
                Try again
              </Button>
            ) : null}
            {status === "interrupted" ? (
              <Button
                onClick={() => {
                  engine.continueInterrupted(record.id);
                }}
              >
                Continue
              </Button>
            ) : null}
            {status === "unknown" ? (
              <Button
                onClick={() => {
                  engine.checkAgain(record.id);
                }}
              >
                Check again
              </Button>
            ) : null}
            {finished && saleId ? (
              <Button asChild>
                <Link href={`/purchases/${saleId}`} onClick={close}>
                  View purchase
                </Link>
              </Button>
            ) : null}
            {finished && campaignId ? (
              <Button asChild>
                <Link href={`/sell/campaigns/${campaignId}`} onClick={close}>
                  View campaign
                </Link>
              </Button>
            ) : null}
            {finished && nodeId ? (
              <Button asChild>
                <Link href={`/earn/links/${nodeId}`} onClick={close}>
                  View link
                </Link>
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      {record && status ? (
        <div className="grid gap-4">
          <p className="font-medium" aria-live="polite">
            {statusLabels[status]}
          </p>
          {record.steps.map((step, index) => (
            <div key={step.id} className="bg-soft rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <span>
                  {index + 1}. {step.kind.replace(/([A-Z])/g, " $1")}
                </span>
                <span className="text-subtle text-sm">
                  {step.skipped ? "Already approved" : step.status.replaceAll("_", " ")}
                </span>
              </div>
              {step.error ? (
                <p role="alert" className="text-pink-ink mt-2 text-sm">
                  {step.error.message}
                </p>
              ) : null}
              {step.hash && record.mode === "live" ? (
                <a
                  className="mt-2 block truncate text-sm underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`${activeChain.blockExplorers?.default.url ?? "https://testnet.monadvision.com"}/tx/${step.hash}`}
                >
                  View transaction
                </a>
              ) : null}
            </div>
          ))}
          {record.mode === "live" ? (
            <p className="text-subtle text-sm">
              Network fees paid: {formatMonFee(totalFeePaid(record))}
            </p>
          ) : null}
          <p className="text-subtle text-sm">
            You can hide this sheet. Sent transactions keep running and resume after a reload.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {records.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            records.toReversed().map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  engine.show(item.id);
                }}
                className="bg-soft rounded-xl p-3 text-left"
              >
                <span className="block">{txLabel(item)}</span>
                <span className="text-subtle text-sm">{statusLabels[overallStatus(item)]}</span>
              </button>
            ))
          )}
        </div>
      )}
    </Sheet>
  );
}
