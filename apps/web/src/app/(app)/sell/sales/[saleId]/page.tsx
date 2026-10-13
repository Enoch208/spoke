import { SaleDetailPage } from "@/components/sell/core/sales/sale-detail-page";
export default async function Page({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  return <SaleDetailPage saleId={saleId} />;
}
