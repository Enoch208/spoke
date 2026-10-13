"use client";

import Link from "next/link";
import type { SaleReceipt } from "@spoke/protocol";
import { TxHash } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue, type KeyValueItem } from "@/components/ui/key-value";
import { fill, toasts } from "@/lib/copy";
import { formatBlock, shortHash } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { activeChain } from "@/lib/wagmi";
import { saleDetailCopy as copy } from "../copy/sales";
import { hasModal } from "../shared/has-modal";

function Hash({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono tabular-nums" title={value}>
        {shortHash(value)}
      </span>
      <CopyButton
        value={value}
        label={label}
        copiedMessage={fill(toasts["T-01"].copy.thing, { thing: label })}
      />
    </span>
  );
}

export function SaleProof({ receipt, demo }: { receipt: SaleReceipt; demo: boolean }) {
  const tx = (hash: string) => <TxHash hash={hash} chainId={activeChain.id} demo={demo} />;
  const items: KeyValueItem[] = [
    { key: "purchase", label: copy.purchaseTx, value: tx(receipt.purchaseTx.hash) },
    ...(receipt.finalizeTx
      ? [{ key: "finalize", label: copy.finalizeTx, value: tx(receipt.finalizeTx.hash) }]
      : []),
    ...(receipt.refundTx
      ? [{ key: "refund", label: copy.refundTx, value: tx(receipt.refundTx.hash) }]
      : []),
    {
      key: "order",
      label: copy.orderKey,
      value: <Hash value={receipt.orderKey} label={copy.orderKey} />,
    },
    {
      key: "policy",
      label: copy.policyHash,
      value: <Hash value={receipt.policyHash} label={copy.policyHash} />,
      action: (
        <Link
          href={`/sell/campaigns/${receipt.campaignId}?tab=policy`}
          className="text-subtle hover:text-ink text-sm whitespace-nowrap underline-offset-2 hover:underline"
        >
          {fill(copy.policyVersion, { v: String(receipt.policyVersion) })}
        </Link>
      ),
    },
    ...(demo
      ? []
      : [
          {
            key: "block",
            label: copy.indexedLabel,
            value: formatBlock(receipt.indexedBlock),
            mono: true,
          },
        ]),
  ];
  return (
    <Card padding="lg">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.proof}</h2>
        {hasModal("M-45") ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              useUiStore
                .getState()
                .open("M-45", { chainId: demo ? "demo" : activeChain.id, saleId: receipt.saleId });
            }}
          >
            {copy.fullProof}
          </Button>
        ) : null}
      </div>
      <KeyValue items={items} />
    </Card>
  );
}
