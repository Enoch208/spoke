import { PageSkeleton } from "@/components/product/page";
import { CheckoutPage } from "@/components/buy/checkout-page";
import { Suspense } from "react";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutPage campaignId={campaignId} />
    </Suspense>
  );
}
