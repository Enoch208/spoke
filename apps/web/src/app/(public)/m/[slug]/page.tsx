import { MerchantPage } from "@/components/public/merchant-page";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MerchantPage slug={slug} />;
}
