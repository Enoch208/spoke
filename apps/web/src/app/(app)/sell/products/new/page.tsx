import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { ProductEditor } from "@/components/sell/core/products/editor/product-editor";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductEditor />
    </Suspense>
  );
}
