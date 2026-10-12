import { NetworkPage } from "@/components/public/network-page";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return <NetworkPage campaignId={campaignId} />;
}
