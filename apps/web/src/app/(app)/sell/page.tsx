import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { OverviewPage } from "@/components/sell/core/overview/overview-page";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OverviewPage />
    </Suspense>
  );
}
