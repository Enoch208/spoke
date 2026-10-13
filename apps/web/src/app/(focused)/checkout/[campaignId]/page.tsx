import { Suspense } from "react";
import { CheckoutPage } from "@/components/buy/checkout/checkout-page";
import { PageSkeleton } from "@/components/product/page";

export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutPage campaignId={campaignId} />
    </Suspense>
  );
}
