"use client";

import type { ClientOutput } from "@spoke/protocol";
import { protocolLimits } from "@spoke/protocol";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { claimDialog } from "../copy/settlement";
import { DialogError } from "../shared/dialog-states";
import { useStartTx } from "../shared/use-start";
import { ClaimFrame } from "./claim-frame";

type Vault = ClientOutput<"vault.get">;

function CampaignTitle({ campaignId }: { campaignId: string }) {
  const campaign = useClientQuery("campaigns.get", { campaignId });
  return <>{campaign.data?.product.title ?? `#${campaignId}`}</>;
}

const plan = (data: Vault | undefined, campaignIds: readonly string[], includeReady: boolean) => {
  const rows = (data?.campaigns ?? []).filter((row) => campaignIds.includes(row.campaignId));
  const ready = rows
    .flatMap((row) => row.settledSalesReadyToFinalize.map((saleId) => ({ saleId, row })))
    .slice(0, protocolLimits.maxBatchFinalize);
  const finalizing = includeReady ? ready : [];
  const total = rows.reduce((sum, row) => sum + BigInt(row.proceeds.proceedsClaimable), 0n);
  const claimIds = rows
    .filter(
      (row) =>
        BigInt(row.proceeds.proceedsClaimable) > 0n ||
        finalizing.some((sale) => sale.row.campaignId === row.campaignId),
    )
    .map((row) => row.campaignId);
  return { rows, ready, finalizing, total, claimIds };
};

export function ClaimProceeds({
  campaignIds,
  isTop,
  close,
}: {
  campaignIds: readonly string[];
  isTop: boolean;
  close: () => void;
}) {
  const start = useStartTx();
  const primary = useRef<HTMLButtonElement>(null);
  const [includeReady, setIncludeReady] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [firstId] = campaignIds;
  const vault = useClientQuery(
    "vault.get",
    campaignIds.length === 1 && firstId !== undefined ? { campaignId: firstId } : {},
  );
  const current = plan(vault.data, campaignIds, includeReady);
  const token = current.rows[0]?.token;
  const money = (value: bigint, testnet = false) =>
    token ? formatAmount(value, token, { testnet }) : "";
  const single = current.claimIds.length === 1 ? current.claimIds[0] : undefined;
  const singleTitle = useClientQuery(
    "campaigns.get",
    { campaignId: single ?? "0" },
    { enabled: single !== undefined },
  );
  const nothing = current.total === 0n && current.ready.length === 0;

  const claim = async () => {
    setChecking(true);
    const fresh = plan((await vault.refetch()).data, campaignIds, includeReady);
    setChecking(false);
    if (fresh.total !== current.total) {
      setNotice(fill(claimDialog.changed, { amount: money(fresh.total) }));
      return;
    }
    const txId = start("claimProceeds", {
      campaignIds: fresh.claimIds,
      campaignName: fresh.claimIds.length === 1 ? (singleTitle.data?.product.title ?? null) : null,
      amount: fresh.total.toString(),
      finalizeSaleIds: fresh.finalizing.map((sale) => sale.saleId),
    });
    if (txId) close();
  };

  const n = String(current.finalizing.length);
  const label =
    current.finalizing.length > 0
      ? fill(claimDialog.proceedsWithFinalize, { n })
      : fill(claimDialog.primary, { amount: money(current.total) });

  return (
    <ClaimFrame
      title={claimDialog.proceedsTitle}
      isTop={isTop}
      close={close}
      primaryRef={primary}
      amount={vault.isPending ? <Skeleton className="h-9 w-56" /> : money(current.total, true)}
      lines={[
        ...current.rows.map((row) => ({
          key: row.campaignId,
          label: <CampaignTitle campaignId={row.campaignId} />,
          amount: formatAmount(BigInt(row.proceeds.proceedsClaimable), row.token),
        })),
        ...current.finalizing.map((sale) => ({
          key: `ready-${sale.saleId}`,
          label: fill(claimDialog.finalizesFirst, { saleId: sale.saleId }),
          amount: "",
        })),
      ]}
      notes={[claimDialog.proceedsNote]}
      nothing={vault.data && nothing ? claimDialog.nothingProceeds : null}
      pendingHref="/sell/sales"
      notice={notice}
      needsFunds={false}
      primary={
        <Button
          ref={primary}
          disabled={vault.isPending || current.claimIds.length === 0}
          loading={checking}
          loadingLabel={claimDialog.checking}
          onClick={() => void claim()}
        >
          {label}
        </Button>
      }
    >
      {vault.error ? <DialogError error={vault.error} retry={() => void vault.refetch()} /> : null}
      {current.ready.length > 0 ? (
        <Checkbox
          checked={includeReady}
          onCheckedChange={(checked) => {
            setIncludeReady(checked);
            setNotice(null);
          }}
          label={fill(claimDialog.includeReady, { n: String(current.ready.length) })}
          description={fill(claimDialog.readyLine, { n: String(current.ready.length) })}
        />
      ) : null}
    </ClaimFrame>
  );
}
