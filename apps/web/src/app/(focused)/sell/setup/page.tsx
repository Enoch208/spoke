import { PageSkeleton } from "@/components/product/page";
import { MerchantSetupPage } from "@/components/sell/core/setup/setup-page";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MerchantSetupPage />
    </Suspense>
  );
}
