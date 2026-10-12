"use client";

import { ProductPage, QueryState, PageLink, Stat } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { useNow } from "@/lib/use-now";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount, formatBps, formatPerson } from "@/lib/format";

export function ReceiptPage({ saleId, chainId = 10143 }: { saleId: string; chainId?: number }) {
  const now = useNow();
  const receipt = useClientQuery("receipts.get", { saleId, chainId });
  const verify = useClientQuery(
    "receipts.verify",
    { saleId, chainId },
    { enabled: Boolean(receipt.data), refetchInterval: 15_000 },
  );
  const data = receipt.data;
  return (
    <ProductPage
      title={`Sale #${saleId}`}
      description="An onchain receipt. Rewards are merchant funded and are only claimable after finalization."
      actions={
        data ? <PageLink href={`/c/${data.campaignId}/network`}>View the path</PageLink> : undefined
      }
    >
      <QueryState
        pending={receipt.isPending}
        error={receipt.error}
        retry={() => void receipt.refetch()}
      >
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Sale state"
                value={
                  data.state === "PENDING" && now >= Date.parse(data.unlockAt)
                    ? "Ready to finalize"
                    : data.state
                }
              />
              <Stat label="Buyer paid" value={formatAmount(BigInt(data.price), data.token)} />
              <Stat
                label="Merchant-funded reward"
                value={formatAmount(BigInt(data.rewardReserved), data.token)}
              />
            </div>
            <Card>
              <h2 className="font-display text-h4">Paid path</h2>
              <div className="mt-3 divide-y divide-hairline">
                {data.allocations.map((allocation) => (
                  <div
                    key={allocation.level}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p>
                        Level {allocation.level} · {formatPerson(allocation.recipient)}
                      </p>
                      <p className="text-subtle text-sm">
                        {formatBps(allocation.effectiveWeightBps)} · {allocation.state}
                      </p>
                    </div>
                    <p className="font-mono">
                      {formatAmount(BigInt(allocation.amount), data.token)}
                    </p>
                  </div>
                ))}
              </div>
              {data.allocations.length === 0 ? (
                <p className="text-body mt-3">
                  Direct purchase. Nobody earns a commission on this purchase.
                </p>
              ) : null}
            </Card>
            <Card>
              <h2 className="font-display text-h4">Settlement timeline</h2>
              <p className="text-body mt-3">
                Purchased {new Date(data.purchasedAt).toLocaleString()}. Hold ends{" "}
                {new Date(data.unlockAt).toLocaleString()}.
              </p>
              <ol className="mt-4 space-y-3">
                {data.timeline.map((event) => (
                  <li
                    key={`${event.state}-${event.tx.hash}`}
                    className="flex flex-wrap justify-between gap-2"
                  >
                    <span>{event.state}</span>
                    <a
                      href={event.tx.explorerUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline"
                    >
                      {new Date(event.at).toLocaleString()}
                    </a>
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <p className="text-sm">
                {verify.data
                  ? verify.data.matchesIndex
                    ? `Verified against the contract at block ${verify.data.blockNumber}.`
                    : `Contract read at block ${verify.data.blockNumber}; the activity index is catching up.`
                  : "Contract verification is loading."}
              </p>
              <div className="mt-4 grid gap-3">
                <CopyField
                  value={data.policyHash}
                  label="Immutable policy hash"
                  copiedMessage="Policy hash copied"
                />
                <CopyField
                  value={data.orderKey}
                  label="Order key"
                  copiedMessage="Order key copied"
                />
              </div>
              <a
                href={data.purchaseTx.explorerUrl ?? "#"}
                className="mt-4 block underline"
                target="_blank"
                rel="noreferrer"
              >
                View purchase transaction
              </a>
            </Card>
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
