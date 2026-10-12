import { ReceiptPage } from "@/components/public/receipt-page";
import { activeChain } from "@/lib/wagmi";

export default async function Page({
  params,
}: {
  params: Promise<{ chainId: string; saleId: string }>;
}) {
  const { chainId, saleId } = await params;
  return (
    <ReceiptPage chainId={chainId === "demo" ? activeChain.id : Number(chainId)} saleId={saleId} />
  );
}
