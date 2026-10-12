import { MerchantCampaignPage } from "@/components/sell/core/campaign-page";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <MerchantCampaignPage campaignId={campaignId} />;
}
