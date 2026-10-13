import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { SalesPage } from "@/components/sell/core/sales/sales-page";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton shape="rows" />}>
      <SalesPage />
    </Suspense>
  );
}
