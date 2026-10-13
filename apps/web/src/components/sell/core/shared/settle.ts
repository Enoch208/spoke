"use client";

import { protocolLimits } from "@spoke/protocol";
import { useUiStore } from "@/lib/stores/ui";
import type { VaultCampaign } from "./ledger";

export const batchLimit = protocolLimits.maxBatchFinalize;

export const openFinalize = (saleIds: readonly string[]) => {
  const batch = saleIds.slice(0, batchLimit);
  if (batch.length > 0) useUiStore.getState().open("M-20", { saleIds: batch });
};

export const proceedsCampaigns = (rows: readonly VaultCampaign[]) =>
  rows.filter(
    (row) =>
      BigInt(row.proceeds.proceedsClaimable) > 0n || row.settledSalesReadyToFinalize.length > 0,
  );

export const openClaimProceeds = (rows: readonly VaultCampaign[]) => {
  const campaignIds = proceedsCampaigns(rows).map((row) => row.campaignId);
  if (campaignIds.length > 0)
    useUiStore.getState().open("M-21", { source: "SALE_PROCEEDS", campaignIds });
};
