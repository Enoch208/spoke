"use client";

import { Alert02Icon, CheckmarkCircle02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ModeBadge } from "@/components/ui/mode-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/lib/client/provider";
import { common, fill } from "@/lib/copy";
import { formatAmount, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { finalizeDialog } from "../copy/settlement";
import { FeeLine } from "../shared/fee-line";
import { sameAddress, useViewerAddress } from "../shared/viewer";
import { useFinalizeRun } from "./use-finalize-run";

function SaleLine({ saleId, state }: { saleId: string; state: "waiting" | "active" | "done" }) {
  const now = useNow();
  const viewer = useViewerAddress();
  const receipt = useClientQuery("receipts.get", { saleId, chainId: activeChain.id });
  const sale = receipt.data;
  const mine = sale?.allocations.find((allocation) =>
    sameAddress(allocation.recipient.address, viewer),
  );
  const icon = state === "done" ? CheckmarkCircle02Icon : Clock01Icon;
  return (
    <li
      className="flex items-center gap-3 py-3"
      aria-current={state === "active" ? "step" : undefined}
    >
      <HugeiconsIcon
        icon={icon}
        size={18}
        strokeWidth={1.8}
        aria-hidden="true"
        className={
          state === "done" ? "text-lime-ink" : state === "active" ? "text-ink" : "text-faint"
        }
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink font-medium">#{saleId}</p>
        <p className="text-subtle text-sm">
          {sale
            ? fill(finalizeDialog.holdEnded, {
                time: formatRelative(new Date(sale.unlockAt), { now: new Date(now) }),
              })
            : null}
        </p>
      </div>
      {sale ? (
        <span className="text-ink font-mono text-sm tabular-nums">
          {formatAmount(BigInt(mine?.amount ?? sale.rewardReserved), sale.token)}
        </span>
      ) : (
        <Skeleton className="h-4 w-20" />
      )}
    </li>
  );
}

export function FinalizeBatch({
  saleIds,
  isTop,
  close,
}: {
  saleIds: readonly string[];
  isTop: boolean;
  close: () => void;
}) {
  const { mode } = useClientContext();
  const primary = useRef<HTMLButtonElement>(null);
  const { run, begin, resume } = useFinalizeRun(saleIds);
  const n = String(saleIds.length);
  const lineState = (index: number) =>
    run.status === "done" || index < run.index
      ? "done"
      : index === run.index && run.status !== "idle"
        ? "active"
        : "waiting";
  const stoppedAt = saleIds[run.index] ?? "";

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="sm"
      inert={!isTop}
      initialFocus={primary}
      title={fill(finalizeDialog.batchTitle, { n })}
      badge={<ModeBadge mode={mode} />}
      footer={
        run.status === "done" ? (
          <Button ref={primary} onClick={close}>
            {finalizeDialog.done}
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              {run.status === "idle" ? common.cancel : common.hide}
            </Button>
            {run.status === "stopped" ? (
              <Button ref={primary} onClick={resume}>
                {fill(finalizeDialog.resume, { saleId: stoppedAt })}
              </Button>
            ) : (
              <Button
                ref={primary}
                loading={run.status === "running"}
                loadingLabel={fill(finalizeDialog.progress, {
                  i: String(run.index + 1),
                  n,
                })}
                onClick={begin}
              >
                {fill(finalizeDialog.batchPrimary, { n })}
              </Button>
            )}
          </>
        )
      }
    >
      <div className="grid gap-4">
        <p className="text-body">
          {fill(finalizeDialog.batchBody, { n })} {finalizeDialog.batchLimit}
        </p>
        <ol aria-label={common.steps} className="divide-hairline bg-soft divide-y rounded-xl px-4">
          {saleIds.map((saleId, index) => (
            <SaleLine key={saleId} saleId={saleId} state={lineState(index)} />
          ))}
        </ol>
        <p className="text-subtle text-sm">{finalizeDialog.noRefunds}.</p>
        <div aria-live="polite">
          {run.status === "running" ? (
            <p className="text-ink text-sm font-medium">
              {fill(finalizeDialog.progress, { i: String(run.index + 1), n })}
            </p>
          ) : null}
          {run.status === "done" ? (
            <p className="text-lime-ink text-sm font-medium">
              {fill(finalizeDialog.allDone, { n })}
            </p>
          ) : null}
          {run.status === "stopped" ? (
            <p className="text-pink-ink flex items-center gap-2 text-sm">
              <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
              {fill(finalizeDialog.stopped, { saleId: stoppedAt })}
            </p>
          ) : null}
        </div>
        {run.status === "idle" ? <FeeLine /> : null}
      </div>
    </Dialog>
  );
}
