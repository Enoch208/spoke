import { ReferralPage } from "@/components/public/referral-page";
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ReferralPage code={code} />;
}
