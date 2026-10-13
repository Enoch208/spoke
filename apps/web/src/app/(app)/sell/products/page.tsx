import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { ProductsPage } from "@/components/sell/core/products/products-page";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton shape="rows" />}>
      <ProductsPage />
    </Suspense>
  );
}
