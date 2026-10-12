"use client";

import Link from "next/link";
import { demoToken } from "@spoke/protocol";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { useNow } from "@/lib/use-now";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount } from "@/lib/format";

export function PurchasesPage({ merchant = false }: { merchant?: boolean }) {
  const now = useNow();
  const purchases = useClientQuery(merchant ? "receipts.forMerchant" : "receipts.forBuyer", {});
  return (
    <ProductPage
      title={merchant ? "Sales" : "Your purchases"}
      description={
        merchant
          ? "Pending payments are held until their settlement hold ends. Finalized proceeds can be claimed from your vault."
          : "Access your products, inspect receipts and follow the settlement hold."
      }
      actions={
        <PageLink href={merchant ? "/sell/vault" : "/explore"}>
          {merchant ? "Open vault" : "Explore campaigns"}
        </PageLink>
      }
    >
      <QueryState
        pending={purchases.isPending}
        error={purchases.error}
        retry={() => void purchases.refetch()}
      >
        <div className="grid gap-3">
          {purchases.data?.items.map((purchase) => (
            <Link
              key={purchase.saleId}
              href={merchant ? `/sell/sales/${purchase.saleId}` : `/purchases/${purchase.saleId}`}
            >
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">{purchase.productTitle}</h2>
                  <p className="text-subtle text-sm">
                    {purchase.merchantName} · Sale #{purchase.saleId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono">
                    {formatAmount(BigInt(purchase.amountPaid), demoToken)}
                  </p>
                  <p className="text-subtle text-sm">
                    {purchase.state === "PENDING" && now >= Date.parse(purchase.unlockAt)
                      ? "Ready to finalize"
                      : purchase.state}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
          {purchases.data?.items.length === 0 ? (
            <Card>
              <p>
                {merchant
                  ? "No sales yet. Share your campaign with distributors and buyers."
                  : "No purchases yet. Products you buy will appear here."}
              </p>
            </Card>
          ) : null}
        </div>
      </QueryState>
    </ProductPage>
  );
}
