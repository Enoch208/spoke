"use client";

import type { CampaignDetail, ClientOutput } from "@spoke/protocol";
import { CopyField } from "@/components/ui/copy-field";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";
import { proofCopy } from "../copy/proof";
import { ProofSection, type ProofRow } from "../shared/proof-section";

type Policy = ClientOutput<"campaigns.policy">;

const versionRows = (policy: Policy | undefined): ProofRow[] => {
  if (!policy) return [];
  const current = policy.current;
  const rows: ProofRow[] = [
    {
      key: "policy",
      label: proofCopy.policyHash,
      note: fill(proofCopy.policyVersion, {
        version: String(current.version),
        date: formatDateTime(new Date(current.effectiveAt)),
      }),
      kind: "hash",
      value: current.policyHash,
    },
  ];
  if (policy.scheduled)
    rows.push({
      key: "scheduled",
      label: proofCopy.scheduledHash,
      note: fill(proofCopy.scheduledVersion, {
        version: String(policy.scheduled.version),
        date: formatDateTime(new Date(policy.scheduled.effectiveAt)),
      }),
      kind: "hash",
      value: policy.scheduled.policyHash,
    });
  for (const earlier of policy.history.filter((entry) => entry.version < current.version))
    rows.push({
      key: `history-${String(earlier.version)}`,
      label: fill(proofCopy.earlierHash, { version: String(earlier.version) }),
      note: fill(proofCopy.earlierLine, {
        date: formatDateTime(
          new Date(
            [...policy.history, current].find((entry) => entry.version === earlier.version + 1)
              ?.effectiveAt ?? current.effectiveAt,
          ),
        ),
      }),
      kind: "hash",
      value: earlier.policyHash,
    });
  return rows;
};

export function CampaignProof({
  campaign,
  policy,
}: {
  campaign: CampaignDetail;
  policy: Policy | undefined;
}) {
  const { mode } = useClientContext();
  const rows: ProofRow[] = [
    { key: "id", label: proofCopy.campaignId, kind: "text", value: campaign.campaignId },
    {
      key: "contract",
      label: proofCopy.contract,
      kind: "address",
      value: campaign.contractAddress,
    },
    ...versionRows(policy),
    {
      key: "token",
      label: proofCopy.token,
      note: fill(proofCopy.tokenDetails, {
        symbol: campaign.token.symbol,
        decimals: String(campaign.token.decimals),
      }),
      kind: "address",
      value: campaign.token.address,
    },
    { key: "creation", label: proofCopy.creation, kind: "tx", value: campaign.creationTx.hash },
    ...campaign.fundingTxs.map((tx, index): ProofRow => ({
      key: `funding-${tx.hash}`,
      label: fill(proofCopy.funding, { index: String(index + 1) }),
      kind: "tx",
      value: tx.hash,
    })),
  ];
  const apiUrl = `GET ${publicEnv.NEXT_PUBLIC_API_URL}/v1/campaigns/${campaign.campaignId}`;
  return (
    <ProofSection
      rows={rows}
      chainId={campaign.chainId}
      footer={
        mode === "live" ? (
          <div className="flex flex-col gap-2">
            <p className="text-subtle text-sm">{proofCopy.api}</p>
            <CopyField
              value={apiUrl}
              label={proofCopy.copyApi}
              copiedMessage={proofCopy.apiCopied}
            />
          </div>
        ) : null
      }
    />
  );
}
