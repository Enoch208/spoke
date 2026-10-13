"use client";

import type { ClientOutput } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue, type KeyValueItem } from "@/components/ui/key-value";
import { shortHash } from "@/lib/format";
import { useModeStore } from "@/lib/stores/mode";
import { launchedCopy } from "./copy-launch";

const copy = launchedCopy;

type Campaign = ClientOutput<"campaigns.get">;
type TxRef = Campaign["creationTx"];

function TxValue({ tx, demo }: { tx: TxRef; demo: boolean }) {
  if (demo || !tx.explorerUrl) return <span className="text-subtle">{copy.simulated}</span>;
  return (
    <a
      href={tx.explorerUrl}
      target="_blank"
      rel="noreferrer"
      className="text-ink font-mono underline decoration-line underline-offset-4 hover:decoration-ink"
    >
      {shortHash(tx.hash)}
    </a>
  );
}

export function LaunchedProof({ campaign }: { campaign: Campaign }) {
  const demo = useModeStore((state) => state.mode) === "demo";
  const items: KeyValueItem[] = [
    { key: "id", label: copy.campaignId, value: campaign.campaignId, mono: true },
    {
      key: "policy",
      label: copy.policyHash,
      value: shortHash(campaign.policy.policyHash),
      mono: true,
      action: (
        <CopyButton
          value={campaign.policy.policyHash}
          label={copy.policyHash}
          copiedMessage={copy.policyHash}
        />
      ),
    },
    {
      key: "created",
      label: copy.created,
      value: <TxValue tx={campaign.creationTx} demo={demo} />,
    },
    ...campaign.fundingTxs.map((tx) => ({
      key: `funded-${tx.hash}`,
      label: copy.funded,
      value: <TxValue tx={tx} demo={demo} />,
    })),
  ];
  return (
    <Card padding="lg" className="flex min-w-0 flex-col gap-2">
      <h3 className="text-ink text-base font-medium">{copy.proof}</h3>
      <KeyValue items={items} />
      <p className="text-subtle text-sm">{copy.indexing}</p>
    </Card>
  );
}
