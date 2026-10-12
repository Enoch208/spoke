"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { campaignStateKey } from "@/lib/domain/campaign-state";
import { formatAmount, pluralize } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { isActive } from "@/lib/tx/records";
import { activeChain } from "@/lib/wagmi";
import { payoutsCopy } from "../copy/payouts";
import { CampaignName, type CampaignCard } from "../shared/campaigns";

export function SaleButton({ saleId }: { saleId: string }) {
  const open = useUiStore((state) => state.open);
  return (
    <button
      type="button"
      onClick={() => open("M-16", { saleId })}
      className="text-ink hover:text-body cursor-pointer font-medium underline-offset-2 hover:underline"
    >
      #{saleId}
    </button>
  );
}

export function SharesOnSale({ saleId }: { saleId: string }) {
  const receipt = useClientQuery("receipts.get", { saleId, chainId: activeChain.id });
  if (!receipt.data) return <Skeleton className="h-4 w-28" />;
  return (
    <span className="text-body">
      {pluralize(receipt.data.allocations.length, "person", "people")} ·{" "}
      <span className="font-mono tabular-nums">
        {formatAmount(BigInt(receipt.data.rewardReserved), receipt.data.token)}
      </span>
    </span>
  );
}

export function ProductCell({
  campaignId,
  campaign,
}: {
  campaignId: string;
  campaign: CampaignCard | undefined;
}) {
  const inactive = campaign ? campaignStateKey(campaign) !== "live" : false;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <CampaignName campaignId={campaignId} known={campaign} />
      {campaign && inactive ? (
        <Tooltip content={payoutsCopy.finalize.pausedTip}>
          <span tabIndex={0}>
            <CampaignStateChip campaign={campaign} />
          </span>
        </Tooltip>
      ) : null}
    </span>
  );
}

export function FinalizeButton({ saleId, block = false }: { saleId: string; block?: boolean }) {
  const open = useUiStore((state) => state.open);
  const running = useTxStore((state) =>
    state.records.some(
      (record) => record.kind === "finalize" && record.params.saleId === saleId && isActive(record),
    ),
  );
  return (
    <Button
      size="sm"
      variant="secondary"
      block={block}
      loading={running}
      loadingLabel={payoutsCopy.finalize.running}
      onClick={() => open("M-20", { saleIds: [saleId] })}
    >
      {payoutsCopy.finalize.action}
    </Button>
  );
}
