"use client";

import { explorerTxUrl } from "@spoke/protocol";
import Link from "next/link";
import { useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Piece } from "@/components/art/piece";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { KeyValue } from "@/components/ui/key-value";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatAmount, formatDateTime, formatPerson, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { activeChain } from "@/lib/wagmi";
import { doneCopy } from "./copy/done";
import { ShareCard, shareBodyFor } from "./share-card";
import { useCloseOnNavigate } from "./use-close-on-navigate";

const slowAfterMs = 60_000;

export default function PurchaseDoneModal({ props, close }: ModalComponentProps<"M-18">) {
  const { mode } = useClientContext();
  const demo = mode === "demo";
  const [openedAt] = useState(() => Date.now());
  useCloseOnNavigate(close);
  const receipt = useClientQuery(
    "receipts.get",
    { saleId: props.saleId, chainId: activeChain.id },
    { refetchInterval: 5_000 },
  );
  const campaign = useClientQuery("campaigns.get", { campaignId: props.campaignId });
  const data = receipt.data;
  const product = campaign.data?.product.title ?? "";
  const merchant = campaign.data?.merchant.name ?? "";
  const referrer = data?.allocations.find((allocation) => allocation.level === 1)?.recipient;
  const slow = !data && receipt.dataUpdatedAt - openedAt > slowAfterMs;
  const explorer = data && !demo ? explorerTxUrl(activeChain.id, data.purchaseTx.hash) : null;
  return (
    <Dialog
      open
      size="md"
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={fill(doneCopy.modalTitle, { product })}
      headerStart={<Piece id="purchase-done" shape="lime" className="mt-1 h-8 w-auto shrink-0" />}
      footer={
        <>
          <Button
            variant="ghost"
            disabled={!data}
            onClick={() => {
              close();
              useUiStore.getState().open("M-45", {
                saleId: props.saleId,
                chainId: demo ? "demo" : activeChain.id,
              });
            }}
          >
            {doneCopy.proof}
          </Button>
          <Button asChild variant="secondary">
            <Link href={routeTo.purchase(props.saleId)} onClick={close}>
              {doneCopy.viewReceipt}
            </Link>
          </Button>
          {data ? (
            <Button asChild>
              <Link href={routeTo.purchaseAccess(props.saleId)} onClick={close}>
                {doneCopy.getProduct}
              </Link>
            </Button>
          ) : (
            <Button loading disabled>
              {doneCopy.getProduct}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body">
          {demo ? doneCopy.observedDemo : data ? doneCopy.modalBody : doneCopy.modalSyncing}
        </p>
        {slow ? (
          <div className="bg-amber-soft flex flex-col gap-2 rounded-xl p-3 text-sm">
            <p className="text-amber-ink">{doneCopy.modalSlow}</p>
            <Button
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => {
                useUiStore.getState().open("M-41", { context: { saleId: props.saleId } });
              }}
            >
              {doneCopy.reportProblem}
            </Button>
          </div>
        ) : null}
        {data ? (
          <KeyValue
            items={[
              {
                key: "paid",
                label: doneCopy.paidLabel,
                value: formatAmount(BigInt(data.price), data.token, { testnet: true }),
                mono: true,
              },
              { key: "sale", label: doneCopy.saleLabel, value: `#${data.saleId}`, mono: true },
              {
                key: "time",
                label: doneCopy.timeLabel,
                value: formatDateTime(new Date(data.purchasedAt)),
              },
              ...(referrer
                ? [
                    {
                      key: "referrer",
                      label: doneCopy.referrerLabel,
                      value: formatPerson(referrer),
                    },
                  ]
                : []),
            ]}
          />
        ) : null}
        {data ? (
          <p className="text-body text-sm">
            {fill(doneCopy.merchantRefund, {
              merchant,
              unlockAt: formatRelative(new Date(data.unlockAt)),
            })}
          </p>
        ) : null}
        {explorer ? (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="text-ink self-start text-sm font-medium underline underline-offset-2"
          >
            {doneCopy.viewOnExplorer}
          </a>
        ) : null}
        {data && data.state !== "REFUNDED" ? (
          <ShareCard
            saleId={data.saleId}
            campaignId={data.campaignId}
            parentNodeId={data.nodeId}
            title={doneCopy.shareTitle}
            body={shareBodyFor(product)}
            existingNodeId={null}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
