import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { PurchasesPage } from "@/components/buy/purchases/purchases-page";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton shape="rows" />}>
      <PurchasesPage />
    </Suspense>
  );
}
