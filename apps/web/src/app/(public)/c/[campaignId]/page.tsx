import { CampaignPage } from "@/components/public/campaign-page";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <CampaignPage campaignId={campaignId} />;
}
