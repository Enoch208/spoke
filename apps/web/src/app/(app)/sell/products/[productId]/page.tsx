import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { ProductEditor } from "@/components/sell/core/products/editor/product-editor";
export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductEditor productId={productId} />
    </Suspense>
  );
}
