"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { KeyValue } from "@/components/ui/key-value";
import { ModeBadge } from "@/components/ui/mode-badge";
import { useClientContext } from "@/lib/client/provider";
import { common, fill } from "@/lib/copy";
import {
  formatAmount,
  formatCountdown,
  formatDateTime,
  formatRelative,
  pluralize,
} from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { finalizeDialog } from "../copy/settlement";
import { DialogError, DialogSkeleton } from "../shared/dialog-states";
import { FeeLine } from "../shared/fee-line";
import { useStartTx } from "../shared/use-start";
import { sameAddress, useViewerAddress } from "../shared/viewer";

export function FinalizeSingle({
  saleId,
  isTop,
  close,
}: {
  saleId: string;
  isTop: boolean;
  close: () => void;
}) {
  const { mode } = useClientContext();
  const now = useNow();
  const viewer = useViewerAddress();
  const start = useStartTx();
  const open = useUiStore((state) => state.open);
  const primary = useRef<HTMLButtonElement>(null);
  const receipt = useClientQuery("receipts.get", { saleId, chainId: activeChain.id });
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: receipt.data?.campaignId ?? "0" },
    { enabled: Boolean(receipt.data) },
  );
  const sale = receipt.data;
  const unlockAt = sale ? Date.parse(sale.unlockAt) : 0;
  const mature = sale?.state === "PENDING" && now >= unlockAt;
  const mine = sale?.allocations.find((allocation) =>
    sameAddress(allocation.recipient.address, viewer),
  );
  const claimable = sale?.state === "FINALIZED" && mine?.state === "claimable" ? mine : null;
  const at = (value: number) => formatRelative(new Date(value), { now: new Date(now) });

  const footer = sale ? (
    <>
      <Button variant="secondary" onClick={close}>
        {sale.state === "PENDING" ? common.cancel : common.close}
      </Button>
      {sale.state === "PENDING" ? (
        <Button
          ref={primary}
          disabled={!mature}
          disabledReason={fill(finalizeDialog.countdown, {
            time: formatCountdown(Math.max(0, (unlockAt - now) / 1000)),
          })}
          onClick={() => {
            if (start("finalize", { saleId })) close();
          }}
        >
          {finalizeDialog.primary}
        </Button>
      ) : null}
      {claimable ? (
        <Button
          onClick={() => {
            close();
            open("M-21", { source: "REWARD", token: sale.token.address });
          }}
        >
          {fill(finalizeDialog.claim, {
            amount: formatAmount(BigInt(claimable.amount), sale.token),
          })}
        </Button>
      ) : null}
    </>
  ) : undefined;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="sm"
      inert={!isTop}
      initialFocus={primary}
      title={fill(finalizeDialog.title, { saleId })}
      badge={<ModeBadge mode={mode} />}
      footer={footer}
    >
      {receipt.isPending ? <DialogSkeleton /> : null}
      {receipt.error ? (
        <DialogError error={receipt.error} retry={() => void receipt.refetch()} />
      ) : null}
      {sale ? (
        <div className="grid gap-4">
          {sale.state === "REFUNDED" ? (
            <p className="text-body">{finalizeDialog.refunded}</p>
          ) : null}
          {sale.state === "FINALIZED" ? (
            <p className="text-body">
              {fill(finalizeDialog.alreadyFinal, {
                time: sale.finalizeTx?.at ? at(Date.parse(sale.finalizeTx.at)) : "",
              })}
            </p>
          ) : null}
          {sale.state === "PENDING" && !mature ? (
            <p className="text-body" aria-live="off">
              {fill(finalizeDialog.notMature, { unlockAt: formatDateTime(new Date(unlockAt)) })}
            </p>
          ) : null}
          {mature ? (
            <p className="text-body">
              {fill(finalizeDialog.body, {
                unlockAt: at(unlockAt),
                people: pluralize(sale.allocations.length, "person", "people"),
                merchant: campaign.data?.merchant.name ?? "",
              })}
            </p>
          ) : null}
          {sale.state === "PENDING" ? (
            <KeyValue
              className="bg-soft rounded-xl px-4"
              items={[
                {
                  key: "rewards",
                  label: finalizeDialog.rewards,
                  value: (
                    <span className="whitespace-nowrap">
                      {formatAmount(BigInt(sale.rewardReserved), sale.token, { testnet: true })}
                    </span>
                  ),
                  mono: true,
                },
                ...(mine
                  ? [
                      {
                        key: "mine",
                        label: finalizeDialog.yourShare,
                        value: formatAmount(BigInt(mine.amount), sale.token),
                        mono: true,
                      },
                    ]
                  : []),
                {
                  key: "proceeds",
                  label: finalizeDialog.proceeds,
                  value: formatAmount(BigInt(sale.price), sale.token),
                  mono: true,
                },
              ]}
            />
          ) : null}
          {mature ? <p className="text-subtle text-sm">{finalizeDialog.noRefunds}.</p> : null}
          {sale.state === "PENDING" ? <FeeLine /> : null}
        </div>
      ) : null}
    </Dialog>
  );
}
