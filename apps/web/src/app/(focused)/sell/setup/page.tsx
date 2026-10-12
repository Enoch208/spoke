import { MerchantSetupPage } from "@/components/sell/core/setup-page";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Loading…</p>}>
      <MerchantSetupPage />
    </Suspense>
  );
}
