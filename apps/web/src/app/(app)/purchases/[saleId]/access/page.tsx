import { AccessPage } from "@/components/buy/access/access-page";

export default async function Page({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  return <AccessPage saleId={saleId} />;
}
