import { PurchasePage } from "@/components/buy/purchase/purchase-page";

export default async function Page({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  return <PurchasePage saleId={saleId} />;
}
