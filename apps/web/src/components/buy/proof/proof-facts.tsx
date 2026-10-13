import type { ClientOutput } from "@spoke/protocol";
import { Address } from "@/components/ui/address";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue, type KeyValueItem } from "@/components/ui/key-value";
import { fill, toasts } from "@/lib/copy";
import { formatAmount, formatDateTime, shortHash } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { proofCopy } from "../copy/modals";

type Receipt = ClientOutput<"receipts.get">;

const keys = proofCopy.keys;

const hash = (value: string, label: string) => (
  <span className="inline-flex items-center gap-1">
    <span title={value}>{shortHash(value)}</span>
    <CopyButton value={value} label={label} copiedMessage={toasts["T-01"].copy.hash} />
  </span>
);

const simulated = <span className="text-subtle font-ui">{proofCopy.simulated}</span>;

export function ProofFacts({
  receipt,
  demo,
  viewer,
}: {
  receipt: Receipt;
  demo: boolean;
  viewer: string | null;
}) {
  const own = viewer !== null && receipt.buyer?.toLowerCase() === viewer.toLowerCase();
  const items: KeyValueItem[] = [
    {
      key: "network",
      label: keys.network,
      value: demo ? simulated : proofCopy.networkValue,
    },
    {
      key: "contract",
      label: keys.contract,
      value: demo ? (
        simulated
      ) : (
        <Address address={receipt.contractAddress} chainId={activeChain.id} showAddress />
      ),
    },
    { key: "sale", label: keys.saleId, value: receipt.saleId, mono: true },
    ...(demo
      ? []
      : [
          {
            key: "order",
            label: keys.orderKey,
            value: hash(receipt.orderKey, keys.orderKey),
            mono: true,
          },
        ]),
    {
      key: "policy",
      label: keys.policyHash,
      value: demo ? simulated : hash(receipt.policyHash, keys.policyHash),
      mono: !demo,
    },
    {
      key: "version",
      label: keys.policyVersion,
      value: fill(proofCopy.version, { version: String(receipt.policyVersion) }),
    },
    {
      key: "buyer",
      label: keys.buyer,
      value: own ? (
        proofCopy.you
      ) : receipt.buyer && !demo ? (
        <Address address={receipt.buyer} chainId={activeChain.id} />
      ) : (
        simulated
      ),
    },
    {
      key: "referral",
      label: keys.referral,
      value: receipt.nodeId === "0" ? proofCopy.direct : receipt.nodeId,
      mono: receipt.nodeId !== "0",
    },
    {
      key: "price",
      label: keys.price,
      value: formatAmount(BigInt(receipt.price), receipt.token, { testnet: true }),
      mono: true,
    },
    {
      key: "reward",
      label: keys.reward,
      value: formatAmount(BigInt(receipt.rewardReserved), receipt.token),
      mono: true,
    },
    { key: "unlocks", label: keys.unlocks, value: formatDateTime(new Date(receipt.unlockAt)) },
  ];
  return <KeyValue items={items} />;
}
