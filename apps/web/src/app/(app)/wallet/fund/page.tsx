import { Suspense } from "react";
import { AuroraFundingPage } from "@/components/account/aurora-page";
import { PageSkeleton } from "@/components/product/page";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuroraFundingPage />
    </Suspense>
  );
}
