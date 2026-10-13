"use client";

import type { ClientOutput } from "@spoke/protocol";
import { Address } from "@/components/ui/address";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue, type KeyValueItem } from "@/components/ui/key-value";
import { fill, toasts } from "@/lib/copy";
import { formatCount, formatDuration, shortHash } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { checkoutCopy } from "../../copy/checkout";
import { Disclosure } from "./disclosure";

type Campaign = ClientOutput<"campaigns.get">;
type Preview = ClientOutput<"checkout.preview">;

export function SettlementBlock({
  holdSeconds,
  refundPolicy,
  collapsible,
}: {
  holdSeconds: number;
  refundPolicy: string;
  collapsible: boolean;
}) {
  const hold = formatDuration(holdSeconds);
  return (
    <Disclosure
      title={checkoutCopy.settlementTitle}
      summary={fill(checkoutCopy.settlementShort, { hold })}
      collapsible={collapsible}
    >
      <div className="text-body flex flex-col gap-3 text-sm">
        <p>{fill(checkoutCopy.settlement, { hold })}</p>
        <div>
          <p className="text-ink font-medium">{checkoutCopy.refundPolicyTitle}</p>
          <p className="mt-1">
            {refundPolicy.trim() ? refundPolicy : checkoutCopy.refundPolicyEmpty}
          </p>
        </div>
        <div>
          <p className="text-ink font-medium">{checkoutCopy.privacyTitle}</p>
          <p className="mt-1">{checkoutCopy.privacy}</p>
        </div>
      </div>
    </Disclosure>
  );
}

const hashValue = (value: string, label: string, demo: boolean) =>
  demo ? (
    <span className="text-subtle">{checkoutCopy.proof.simulated}</span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <span title={value}>{shortHash(value)}</span>
      <CopyButton value={value} label={label} copiedMessage={toasts["T-01"].copy.hash} />
    </span>
  );

export function ProofDetails({
  campaign,
  preview,
  nodeId,
  orderKey,
  demo,
}: {
  campaign: Campaign;
  preview: Preview | undefined;
  nodeId: string;
  orderKey: string | null;
  demo: boolean;
}) {
  const address = (value: string) =>
    demo ? (
      <span className="text-subtle">{checkoutCopy.proof.simulated}</span>
    ) : (
      <Address address={value} chainId={activeChain.id} showAddress />
    );
  const items: KeyValueItem[] = [
    { key: "network", label: checkoutCopy.proof.network, value: checkoutCopy.proof.networkValue },
    {
      key: "checkout",
      label: checkoutCopy.proof.checkout,
      value: address(campaign.contractAddress),
    },
    { key: "token", label: checkoutCopy.proof.token, value: address(campaign.token.address) },
    { key: "campaign", label: checkoutCopy.proof.campaign, value: campaign.campaignId, mono: true },
    {
      key: "version",
      label: checkoutCopy.proof.policyVersion,
      value: String(preview?.policyVersion ?? campaign.policy.version),
      mono: true,
    },
    {
      key: "hash",
      label: checkoutCopy.proof.policyHash,
      value: hashValue(
        preview?.policyHash ?? campaign.policy.policyHash,
        checkoutCopy.proof.policyHash,
        demo,
      ),
      mono: true,
    },
    {
      key: "node",
      label: checkoutCopy.proof.referralNode,
      value: nodeId === "0" ? checkoutCopy.proof.direct : nodeId,
      mono: nodeId !== "0",
    },
    {
      key: "order",
      label: checkoutCopy.proof.orderKey,
      value: orderKey
        ? hashValue(orderKey, checkoutCopy.proof.orderKey, demo)
        : checkoutCopy.proof.orderKeyLater,
      mono: Boolean(orderKey),
    },
  ];
  return (
    <Disclosure title={checkoutCopy.proofTitle} collapsible>
      <KeyValue items={items} />
      {preview ? (
        <p className="text-subtle mt-3 text-sm">
          {demo
            ? checkoutCopy.proof.simulated
            : fill(checkoutCopy.proof.previewBlock, {
                block: formatCount(BigInt(preview.blockNumber)),
              })}
        </p>
      ) : null}
    </Disclosure>
  );
}
