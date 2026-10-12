"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { ModalComponentProps } from "../modal-types";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus, totalFeePaid } from "@/lib/tx/records";
import { txLabel } from "@/lib/tx/labels";
import { formatMonFee } from "@/lib/format";
import { common, fill, txOverallStatus, txSheet, txSheetMisc } from "@/lib/copy";
import { StepList } from "./step-list";
import { useTxEngine } from "./tx-provider";

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
      title={record ? txLabel(record) : txSheetMisc.listTitle}
      subtitle={record?.mode === "demo" ? txSheetMisc.demoSubtitle : txSheetMisc.liveSubtitle}
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
              {finished ? common.close : common.hide}
            </Button>
            {status === "failed" || status === "rejected" || status === "replaced" ? (
              <Button
                onClick={() => {
                  engine.retry(record.id);
                }}
              >
                {common.tryAgain}
              </Button>
            ) : null}
            {status === "interrupted" ? (
              <Button
                onClick={() => {
                  engine.continueInterrupted(record.id);
                }}
              >
                {txSheetMisc.continue}
              </Button>
            ) : null}
            {status === "unknown" ? (
              <Button
                onClick={() => {
                  engine.checkAgain(record.id);
                }}
              >
                {txSheetMisc.checkAgain}
              </Button>
            ) : null}
            {finished && saleId ? (
              <Button asChild>
                <Link href={`/purchases/${saleId}`} onClick={close}>
                  {txSheetMisc.viewPurchase}
                </Link>
              </Button>
            ) : null}
            {finished && campaignId ? (
              <Button asChild>
                <Link href={`/sell/campaigns/${campaignId}`} onClick={close}>
                  {txSheetMisc.viewCampaign}
                </Link>
              </Button>
            ) : null}
            {finished && nodeId ? (
              <Button asChild>
                <Link href={`/earn/links/${nodeId}`} onClick={close}>
                  {txSheetMisc.viewLink}
                </Link>
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      {record && status ? (
        <div className="grid gap-4">
          <p className="text-ink font-medium" aria-live="polite">
            {txOverallStatus[status]}
          </p>
          <StepList steps={record.steps} live={record.mode === "live"} />
          {record.mode === "live" ? (
            <p className="text-subtle border-hairline border-t pt-4 text-sm">
              {fill(txSheetMisc.feesPaid, { fee: formatMonFee(totalFeePaid(record)) })}
            </p>
          ) : null}
          <p className="text-subtle text-sm">{txSheet.reassurance}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {records.length === 0 ? (
            <p className="text-subtle">{txSheetMisc.empty}</p>
          ) : (
            records.toReversed().map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  engine.show(item.id);
                }}
                className="bg-soft hover:bg-pill ease-spring rounded-xl p-3 text-left transition-colors duration-[423ms]"
              >
                <span className="block">{txLabel(item)}</span>
                <span className="text-subtle text-sm">{txOverallStatus[overallStatus(item)]}</span>
              </button>
            ))
          )}
        </div>
      )}
    </Sheet>
  );
}
