"use client";

import { protocolLimits } from "@spoke/protocol";
import { earnModals } from "@/components/earn/modals";
import { useUiStore } from "@/lib/stores/ui";
import type { useChainAction } from "@/lib/tx/use-action";
import type { VaultCampaign } from "./ledger";

type Start = ReturnType<typeof useChainAction>;

export const batchLimit = protocolLimits.maxBatchFinalize;

export const openFinalize = (saleIds: readonly string[], start: Start) => {
  const batch = saleIds.slice(0, batchLimit);
  if (batch.length === 0) return;
  if (earnModals["M-20"]) {
    useUiStore.getState().open("M-20", { saleIds: batch });
    return;
  }
  for (const saleId of batch) start("finalize", { saleId });
};

export const proceedsCampaigns = (rows: readonly VaultCampaign[]) =>
  rows.filter(
    (row) =>
      BigInt(row.proceeds.proceedsClaimable) > 0n || row.settledSalesReadyToFinalize.length > 0,
  );

export const openClaimProceeds = (
  rows: readonly VaultCampaign[],
  start: Start,
  nameOf: (campaignId: string) => string | null,
) => {
  const ready = proceedsCampaigns(rows);
  if (ready.length === 0) return;
  const campaignIds = ready.map((row) => row.campaignId);
  if (earnModals["M-21"]) {
    useUiStore.getState().open("M-21", { source: "SALE_PROCEEDS", campaignIds });
    return;
  }
  const amount = ready.reduce((sum, row) => sum + BigInt(row.proceeds.proceedsClaimable), 0n);
  start("claimProceeds", {
    campaignIds,
    campaignName: ready.length === 1 ? nameOf(ready[0]?.campaignId ?? "") : null,
    amount: amount.toString(),
    finalizeSaleIds: ready.flatMap((row) => row.settledSalesReadyToFinalize).slice(0, batchLimit),
  });
};
