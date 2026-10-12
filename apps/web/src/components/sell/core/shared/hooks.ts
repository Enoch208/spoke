"use client";

import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { campaignStateKey, rewardPerSale } from "@/lib/domain/campaign-state";
import { useTxStore } from "@/lib/stores/tx";
import { isActive } from "@/lib/tx/records";
import { rewardBuckets, type VaultCampaign } from "./ledger";

export const useIsDemo = () => useClientContext().mode === "demo";

export function useCampaignMoney(campaignId: string) {
  const campaign = useClientQuery("campaigns.get", { campaignId });
  const vault = useClientQuery("vault.get", { campaignId }, { refetchInterval: 15_000 });
  const entry: VaultCampaign | undefined = vault.data?.campaigns.find(
    (row) => row.campaignId === campaignId,
  );
  const data = campaign.data;
  return {
    campaign,
    vault,
    entry,
    buckets: entry ? rewardBuckets(entry.rewards) : null,
    stateKey: data ? campaignStateKey(data) : null,
    reward: data ? rewardPerSale(data) : null,
    name: data?.product.title ?? null,
    pending: campaign.isPending || vault.isPending,
  };
}

export function useOwnsCampaign(merchantSlug: string | undefined) {
  const me = useClientQuery("merchants.me", {});
  if (merchantSlug === undefined || me.isPending) return null;
  return me.data?.slug === merchantSlug;
}

export function useActiveTx(resumeKey: string) {
  const { mode } = useClientContext();
  return useTxStore((state) =>
    state.records.some(
      (record) => record.resumeKey === resumeKey && record.mode === mode && isActive(record),
    ),
  );
}

export function useCampaignNames() {
  const mine = useClientQuery("campaigns.mine", {});
  const names = new Map<string, string>();
  for (const row of mine.data?.items ?? [])
    if (row.campaignId) names.set(row.campaignId, row.productTitle);
  return { mine, names };
}
