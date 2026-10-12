import { ProductEditor } from "@/components/sell/core/product-editor";
export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return <ProductEditor productId={productId} />;
}
