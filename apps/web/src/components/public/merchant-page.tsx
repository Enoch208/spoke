"use client";

import { ProductPage, QueryState, Stat } from "@/components/product/page";
import { CampaignCard } from "@/components/product/campaign-card";
import { useClientQuery } from "@/lib/query/use-client";

export function MerchantPage({ slug }: { slug: string }) {
  const merchant = useClientQuery("merchants.get", { slug });
  const offers = useClientQuery("merchants.offers", { slug });
  const record = useClientQuery("merchants.record", { slug });
  return (
    <ProductPage title={merchant.data?.name ?? "Merchant"} description={merchant.data?.description}>
      <QueryState
        pending={merchant.isPending}
        error={merchant.error}
        retry={() => void merchant.refetch()}
      >
        {merchant.data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Settled sales" value={record.data?.sales.finalized ?? "—"} />
              <Stat label="Refunded sales" value={record.data?.sales.refunded ?? "—"} />
              <Stat label="Offers" value={merchant.data.offersCount} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offers.data?.items.map((campaign) => (
                <CampaignCard key={campaign.campaignId} campaign={campaign} />
              ))}
            </div>
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
