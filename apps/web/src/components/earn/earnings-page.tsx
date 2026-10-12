"use client";

import { common } from "@/lib/copy";
import { useClientContext } from "@/lib/client/provider";
import { receiptHref } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";
import { useNow } from "@/lib/use-now";
import Link from "next/link";
import { earningsBuckets } from "@spoke/protocol";
import { ProductPage, QueryState, PageLink, Stat } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientQuery } from "@/lib/query/use-client";
import { useChainAction } from "@/lib/tx/use-action";
import { asAddress } from "@/lib/tx/calls";
import { formatAmount, formatDateTime } from "@/lib/format";
import { MoneyReceive01Icon } from "@hugeicons/core-free-icons";
import { ShareStateChip } from "@/components/product/state-chips";
import { EmptyState } from "@/components/ui/empty-state";

const labels = {
  atRisk: "At risk",
  readyToFinalize: "Ready to finalize",
  claimable: "Claimable",
  claimed: "Claimed",
  refunded: "Refunded",
  reversed: "Reversed · demo only",
};

export function EarningsPage() {
  const { mode } = useClientContext();
  const now = useNow();
  const summary = useClientQuery("earnings.summary", {}, { refetchInterval: 10_000 });
  const claimable = useClientQuery("earnings.claimable", {}, { refetchInterval: 10_000 });
  const campaigns = useClientQuery("earnings.byCampaign", {});
  const conversions = useClientQuery("earnings.byConversion", {});
  const start = useChainAction();
  const readyFor = (token: string) =>
    claimable.data?.readyToFinalize.filter((sale) =>
      campaigns.data?.some(
        (campaign) =>
          campaign.campaignId === sale.campaignId &&
          campaign.token.address.toLowerCase() === token.toLowerCase(),
      ),
    ) ?? [];
  return (
    <ProductPage
      title="Your earnings"
      description="Only finalized, non-refunded sales earn rewards. Each amount belongs to exactly one bucket."
      actions={<PageLink href="/earn/opportunities">Find campaigns</PageLink>}
    >
      <QueryState
        pending={summary.isPending}
        error={summary.error}
        retry={() => void summary.refetch()}
      >
        {summary.data?.tokens.length === 0 ? (
          <Card>
            <p>
              No earnings yet. Create a link and share a campaign to begin building your settled
              record.
            </p>
          </Card>
        ) : (
          summary.data?.tokens.map((row) => (
            <section key={row.token.address} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {earningsBuckets.map((bucket) => (
                  <Stat
                    key={bucket}
                    label={labels[bucket]}
                    value={formatAmount(BigInt(row[bucket]), row.token)}
                    caption={
                      bucket === "atRisk"
                        ? "The merchant can still refund these sales."
                        : bucket === "readyToFinalize"
                          ? "The hold ended. Finalize before claiming."
                          : undefined
                    }
                  />
                ))}
              </div>
              <Button
                disabled={BigInt(row.claimable) === 0n && readyFor(row.token.address).length === 0}
                onClick={() => {
                  start("claimRewards", {
                    token: asAddress(row.token.address),
                    amount: row.claimable,
                    finalizeSaleIds: readyFor(row.token.address)
                      .slice(0, 10)
                      .map((sale) => sale.saleId),
                  });
                }}
              >
                {readyFor(row.token.address).length
                  ? `Finalize up to ${String(Math.min(10, readyFor(row.token.address).length))} sales and claim`
                  : "Claim rewards"}
              </Button>
            </section>
          ))
        )}
        <Card>
          <h2 className="font-display text-h4">Sales that paid you</h2>
          <div className="mt-4 divide-y divide-hairline">
            {conversions.data?.items.map((conversion) => (
              <Link
                key={`${conversion.saleId}-${String(conversion.level)}`}
                href={receiptHref(conversion.saleId, activeChain.id)}
                className="hover:bg-soft ease-spring -mx-3 flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors duration-[423ms]"
              >
                <div className="min-w-0">
                  <p className="text-ink font-medium">
                    Sale #{conversion.saleId} · Level {conversion.level}
                  </p>
                  <p className="text-subtle text-sm">
                    {Date.parse(conversion.unlockAt) > now ? "Hold ends" : "Hold ended"}{" "}
                    {formatDateTime(new Date(conversion.unlockAt))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ShareStateChip state={conversion.state} unlockAt={conversion.unlockAt} />
                  <span className="text-ink font-mono tabular-nums">
                    {formatAmount(BigInt(conversion.amount), conversion.token)}
                  </span>
                </div>
              </Link>
            ))}
            {conversions.data?.items.length === 0 ? (
              <EmptyState
                icon={MoneyReceive01Icon}
                title="No earnings yet"
                body="When someone buys through your link, or a link shared from it, your share appears here."
              />
            ) : null}
            {conversions.error ? (
              <p className="text-pink-ink">{conversions.error.message}</p>
            ) : null}
          </div>
        </Card>
        <p className="text-subtle text-xs">
          {mode === "demo"
            ? common.simulated
            : `Indexed through block ${summary.data?.indexedBlock ?? "unavailable"}. Direct balance read at block ${summary.data?.blockNumber ?? "unavailable"}.`}
        </p>
      </QueryState>
    </ProductPage>
  );
}
