"use client";

import { useClientQuery } from "@/lib/query/use-client";
import { useMyLinks } from "../shared/campaigns";

export function useRecordCategories() {
  const reputation = useClientQuery("reputation.mine", {});
  const categories = useClientQuery("products.categories", {});
  const links = useMyLinks();
  const settled = (reputation.data?.perCampaign ?? []).filter((row) => row.settledConversions > 0);
  const ids = new Set(
    settled.flatMap((row) => {
      const campaign = links.campaignOf(row.campaignId);
      return campaign ? [campaign.product.category] : [];
    }),
  );
  const names = [...ids].map(
    (id) => categories.data?.find((category) => category.id === id)?.name ?? id,
  );
  return { ids, names };
}
