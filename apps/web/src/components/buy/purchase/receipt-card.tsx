"use client";

import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { TxHash } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue } from "@/components/ui/key-value";
import { fill, toasts } from "@/lib/copy";
import { formatAmount, formatDateTime, formatPerson, shortHash } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { activeChain } from "@/lib/wagmi";
import { purchaseCopy } from "../copy/purchase";

type Receipt = ClientOutput<"receipts.get">;
type Campaign = ClientOutput<"campaigns.get">;

const copy = purchaseCopy.detail;
const keys = copy.keys;

export const referralText = (receipt: Receipt) => {
  const first = receipt.allocations.find((allocation) => allocation.level === 1);
  if (receipt.nodeId === "0" || !first) return copy.directPurchase;
  return fill(copy.through, { referrer: formatPerson(first.recipient) });
};

export function ReceiptCard({
  receipt,
  campaign,
  demo,
}: {
  receipt: Receipt;
  campaign: Campaign | undefined;
  demo: boolean;
}) {
  return (
    <section className="bg-surface border-hairline flex flex-col gap-3 rounded-2xl border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-ink font-medium">{copy.receipt}</h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            useUiStore.getState().open("M-45", {
              saleId: receipt.saleId,
              chainId: demo ? "demo" : activeChain.id,
            });
          }}
        >
          {copy.proof}
        </Button>
      </div>
      <KeyValue
        items={[
          { key: "product", label: keys.product, value: campaign?.product.title ?? "" },
          { key: "merchant", label: keys.merchant, value: campaign?.merchant.name ?? "" },
          {
            key: "paid",
            label: keys.paid,
            value: formatAmount(BigInt(receipt.price), receipt.token, { testnet: true }),
            mono: true,
          },
          {
            key: "purchased",
            label: keys.purchased,
            value: formatDateTime(new Date(receipt.purchasedAt)),
          },
          { key: "referral", label: keys.referral, value: referralText(receipt) },
          { key: "sale", label: keys.saleId, value: receipt.saleId, mono: true },
          {
            key: "campaign",
            label: keys.campaign,
            value: (
              <Link
                href={routeTo.campaign(receipt.campaignId)}
                className="underline underline-offset-2"
              >
                {copy.openCampaign}
              </Link>
            ),
          },
          { key: "network", label: keys.network, value: demo ? copy.simulated : copy.networkValue },
          {
            key: "tx",
            label: keys.purchaseTx,
            value: <TxHash hash={receipt.purchaseTx.hash} chainId={activeChain.id} demo={demo} />,
          },
          {
            key: "order",
            label: keys.orderKey,
            value: demo ? (
              copy.simulated
            ) : (
              <span className="inline-flex items-center gap-1">
                <span title={receipt.orderKey}>{shortHash(receipt.orderKey)}</span>
                <CopyButton
                  value={receipt.orderKey}
                  label={keys.orderKey}
                  copiedMessage={toasts["T-01"].copy.hash}
                />
              </span>
            ),
            mono: !demo,
          },
        ]}
      />
    </section>
  );
}
