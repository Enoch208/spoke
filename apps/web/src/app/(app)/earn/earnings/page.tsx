import { Suspense } from "react";
import { EarningsPage } from "@/components/earn/earnings/earnings-page";
import { PageSkeleton } from "@/components/product/page";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EarningsPage />
    </Suspense>
  );
}
