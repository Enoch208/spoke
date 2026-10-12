import { ReceiptPage } from "@/components/public/receipt-page";
export default async function Page({
  params,
}: {
  params: Promise<{ chainId: string; saleId: string }>;
}) {
  const { chainId, saleId } = await params;
  return <ReceiptPage chainId={Number(chainId)} saleId={saleId} />;
}
