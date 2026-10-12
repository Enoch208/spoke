"use client";

import { receiptHref } from "@/lib/routes";
import Link from "next/link";
import { demoToken } from "@spoke/protocol";
import { ProductPage, QueryState, Stat, PageLink } from "@/components/product/page";
import { InsightsPanel } from "@/components/platform/insights-panel";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount } from "@/lib/format";

export function ProfilePage({ handle, own = false }: { handle?: string; own?: boolean }) {
  const profile = useClientQuery(
    own ? "reputation.mine" : "reputation.get",
    own ? {} : { addressOrHandle: handle ?? "" },
  );
  const data = profile.data && !("hidden" in profile.data) ? profile.data : null;
  return (
    <ProductPage
      title={
        own
          ? "Your portable record"
          : (data?.displayName ?? (data?.handle ? `@${data.handle}` : "Distributor record"))
      }
      description="Only finalized, non-refunded sales count. This record describes attribution through link ancestry."
      actions={own ? <PageLink href="/settings/privacy">Profile visibility</PageLink> : undefined}
    >
      <QueryState
        pending={profile.isPending}
        error={profile.error}
        retry={() => void profile.refetch()}
      >
        {profile.data && "hidden" in profile.data ? (
          <Card>
            <h2 className="font-display text-h4">This profile is private</h2>
            <p className="text-body mt-3">
              The account has not chosen to publish a distribution record.
            </p>
          </Card>
        ) : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label="Settled conversions" value={data.settledConversions ?? "Not shared"} />
              <Stat label="Distinct merchants" value={data.merchantCount ?? "Not shared"} />
              <Stat label="Distinct campaigns" value={data.campaignCount ?? "Not shared"} />
              <Stat
                label="Net attributed value"
                value={
                  data.netAttributedValue === null
                    ? "Not shared"
                    : formatAmount(BigInt(data.netAttributedValue), demoToken)
                }
              />
              <Stat
                label="Settled commission"
                value={
                  data.settledCommission === null
                    ? "Not shared"
                    : formatAmount(BigInt(data.settledCommission), demoToken)
                }
              />
              <Stat
                label="Refund adjustment"
                value={
                  data.refundAdjustment === null
                    ? "Not shared"
                    : formatAmount(BigInt(data.refundAdjustment), demoToken)
                }
              />
            </div>
            <Card>
              <h2 className="font-display text-h4">Evidence</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.evidence.items.map((sale) => (
                  <Link
                    key={sale.saleId}
                    href={receiptHref(sale.saleId, sale.chainId)}
                    className="bg-pill rounded-full px-4 py-2 text-sm"
                  >
                    Sale #{sale.saleId}
                  </Link>
                ))}
              </div>
              {data.evidence.items.length === 0 ? (
                <p className="text-subtle mt-3">
                  {data.visibility === "pseudonymous"
                    ? "Receipt links are not shared on pseudonymous profiles."
                    : "No public settled receipts yet."}
                </p>
              ) : null}
              <p className="text-subtle mt-5 text-xs">
                Methodology {data.methodologyVersion} · Indexed through block{" "}
                {data.lastIndexedBlock ?? "unavailable"}
              </p>
            </Card>
            {own ? <InsightsPanel address={data.subject} /> : null}
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
