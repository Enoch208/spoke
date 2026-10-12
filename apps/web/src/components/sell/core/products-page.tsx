"use client";

import Link from "next/link";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount } from "@/lib/format";

export function ProductsPage() {
  const products = useClientQuery("products.list", {});
  return (
    <ProductPage
      title="Your products"
      description="Prices and deliverables are versioned. Existing sales keep the version they bought."
      actions={<PageLink href="/sell/products/new">Add product</PageLink>}
    >
      <QueryState
        pending={products.isPending}
        error={products.error}
        retry={() => void products.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {products.data?.items.map((product) => (
            <Link key={product.id} href={`/sell/products/${product.id}`}>
              <Card>
                <h2 className="font-display text-h4">{product.title}</h2>
                <p className="text-body mt-2">{product.summary}</p>
                <p className="font-mono mt-4">
                  {formatAmount(BigInt(product.priceBaseUnits), product.token)}
                </p>
                <p className="text-subtle mt-2 text-sm">
                  Version {product.version} · {product.fulfillmentMode}
                </p>
              </Card>
            </Link>
          ))}
        </div>
        {products.data?.items.length === 0 ? (
          <Card>
            <p>Add your first product, then create a campaign with its reward policy and budget.</p>
          </Card>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
