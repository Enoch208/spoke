import { CheckoutPage } from "@/components/buy/checkout-page";
import { Suspense } from "react";
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  return (
    <Suspense fallback={<p className="p-8">Loading…</p>}>
      <CheckoutPage campaignId={campaignId} />
    </Suspense>
  );
}
