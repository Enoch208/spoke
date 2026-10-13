"use client";

import type { SaleReceipt } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/key-value";
import { ModeBadge } from "@/components/ui/mode-badge";
import { fill } from "@/lib/copy";
import { formatAmount, formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { proceedsStateCopy, saleDetailCopy as copy, salesCopy } from "../copy/sales";
import { useActiveTx } from "../shared/hooks";
import { openClaimProceeds, openFinalize } from "../shared/settle";
import { canFinalizeSale, canRefundSale } from "./sale-chip";

export function SaleSummary({ receipt, demo }: { receipt: SaleReceipt; demo: boolean }) {
  const price = BigInt(receipt.price);
  const reward = BigInt(receipt.rewardReserved);
  const settled = receipt.state === "FINALIZED";
  return (
    <Card padding="lg">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.summary}</h2>
        {demo ? <ModeBadge mode="demo" /> : null}
      </div>
      <KeyValue
        items={[
          {
            key: "price",
            label: copy.price,
            value: formatAmount(price, receipt.token, { testnet: true }),
            mono: true,
          },
          {
            key: "reward",
            label: copy.reward,
            value: formatAmount(reward, receipt.token),
            mono: true,
          },
          {
            key: "proceeds",
            label: copy.proceedsState,
            value: proceedsStateCopy[receipt.proceedsState],
          },
          {
            key: "net",
            label: copy.netValue,
            value: settled
              ? formatAmount(price - reward, receipt.token)
              : receipt.state === "REFUNDED"
                ? copy.netRefunded
                : copy.netPending,
            mono: settled,
          },
        ]}
      />
    </Card>
  );
}

export function SaleActions({ receipt, now }: { receipt: SaleReceipt; now: number }) {
  const vault = useClientQuery("vault.get", { campaignId: receipt.campaignId });
  const refunding = useActiveTx(`refund:${receipt.saleId}`);
  const finalizing = useActiveTx(`finalize:${receipt.saleId}`);
  const refundable = canRefundSale(receipt.state, receipt.unlockAt, now);
  const ready = canFinalizeSale(receipt.state, receipt.unlockAt, now);
  const claimable = receipt.state === "FINALIZED" && receipt.proceedsState === "claimable";
  const message =
    receipt.state === "REFUNDED"
      ? copy.refundedMessage
      : receipt.proceedsState === "claimed"
        ? copy.claimedMessage
        : claimable
          ? copy.settledMessage
          : ready
            ? copy.readyMessage
            : `${copy.pendingMessage} ${fill(copy.refundUntil, { time: formatDateTime(new Date(receipt.unlockAt)) })}`;
  const busy = refunding || finalizing;
  return (
    <Card padding="lg" className="space-y-4">
      <h2 className="font-display text-h4 text-ink font-medium">{copy.actions}</h2>
      <p className="text-body text-sm">{message}</p>
      {busy ? (
        <Button block variant="secondary" loading loadingLabel={salesCopy.waiting}>
          {salesCopy.waiting}
        </Button>
      ) : refundable ? (
        <Button
          block
          variant="danger"
          onClick={() => {
            useUiStore.getState().open("M-22", {
              saleId: receipt.saleId,
              ...(receipt.refundRequest?.status === "open"
                ? { disputeId: receipt.refundRequest.disputeId }
                : {}),
            });
          }}
        >
          {salesCopy.refund}
        </Button>
      ) : ready ? (
        <Button
          block
          onClick={() => {
            openFinalize([receipt.saleId]);
          }}
        >
          {salesCopy.finalize}
        </Button>
      ) : claimable && vault.data ? (
        <Button
          block
          onClick={() => {
            openClaimProceeds(vault.data.campaigns);
          }}
        >
          {copy.claim}
        </Button>
      ) : null}
    </Card>
  );
}
