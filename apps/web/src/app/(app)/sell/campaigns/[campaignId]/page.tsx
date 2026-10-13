import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { MerchantCampaignPage } from "@/components/sell/core/campaign/campaign-page";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MerchantCampaignPage campaignId={campaignId} />
    </Suspense>
  );
}
