"use client";

import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { PageLink, ProductPage, QueryState, Stat } from "@/components/product/page";
import { SaleStateChip, ShareStateChip } from "@/components/product/state-chips";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { useClientContext } from "@/lib/client/provider";
import { fill, receiptCopy } from "@/lib/copy";
import { formatAmount, formatBps, formatDateTime, formatPerson } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useNow } from "@/lib/use-now";

const eventLook = (state: string): Pick<TimelineItem, "icon" | "tone"> => {
  if (state === "REFUNDED") return { icon: ArrowTurnBackwardIcon, tone: "pink" };
  if (state === "FINALIZED") return { icon: CheckmarkBadge01Icon, tone: "lime" };
  if (state === "CLAIMED") return { icon: Wallet01Icon, tone: "lime" };
  return { icon: Clock01Icon, tone: "amber" };
};

const eventTitle = (state: string) =>
  state in receiptCopy.events
    ? receiptCopy.events[state as keyof typeof receiptCopy.events]
    : state.charAt(0) + state.slice(1).toLowerCase();

export function ReceiptPage({ saleId, chainId = 10143 }: { saleId: string; chainId?: number }) {
  const now = useNow();
  const { mode } = useClientContext();
  const demo = mode === "demo";
  const receipt = useClientQuery("receipts.get", { saleId, chainId });
  const verify = useClientQuery(
    "receipts.verify",
    { saleId, chainId },
    { enabled: Boolean(receipt.data) && !demo, refetchInterval: 15_000 },
  );
  const data = receipt.data;
  const holdOver = data ? now >= Date.parse(data.unlockAt) : false;
  return (
    <ProductPage
      title={`Sale #${saleId}`}
      description={receiptCopy.description}
      actions={
        data ? (
          <>
            <SaleStateChip status={data.state} unlockAt={data.unlockAt} size="md" />
            <PageLink href={`/c/${data.campaignId}/network`}>{receiptCopy.viewPath}</PageLink>
          </>
        ) : undefined
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
                label={receiptCopy.buyerPaid}
                value={formatAmount(BigInt(data.price), data.token)}
              />
              <Stat
                label={receiptCopy.reward}
                value={formatAmount(BigInt(data.rewardReserved), data.token)}
              />
              <Stat
                label={holdOver ? receiptCopy.holdEnded : receiptCopy.holdEnds}
                value={formatDateTime(new Date(data.unlockAt))}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card>
                <h2 className="font-display text-h4">{receiptCopy.paidPath}</h2>
                {data.allocations.length === 0 ? (
                  <p className="text-body mt-3">{receiptCopy.direct}</p>
                ) : (
                  <ul className="divide-hairline mt-3 divide-y">
                    {data.allocations.map((allocation) => (
                      <li
                        key={allocation.level}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-ink font-medium">
                            {fill(receiptCopy.level, { level: String(allocation.level) })} ·{" "}
                            {formatPerson(allocation.recipient)}
                          </p>
                          <p className="text-subtle text-sm">
                            {formatBps(allocation.effectiveWeightBps)} of the reward
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <ShareStateChip state={allocation.state} unlockAt={data.unlockAt} />
                          <span className="text-ink font-mono tabular-nums">
                            {formatAmount(BigInt(allocation.amount), data.token)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <h2 className="font-display text-h4">{receiptCopy.timeline}</h2>
                <Timeline
                  className="mt-4"
                  label={receiptCopy.timeline}
                  items={data.timeline.map((event) => ({
                    key: `${event.state}-${event.tx.hash}`,
                    title: eventTitle(event.state),
                    time: formatDateTime(new Date(event.at)),
                    ...eventLook(event.state),
                  }))}
                />
              </Card>
            </div>
            <Card>
              <h2 className="font-display text-h4">{receiptCopy.proof}</h2>
              <p className="text-body mt-2 text-sm">
                {demo
                  ? receiptCopy.simulated
                  : verify.data
                    ? fill(
                        verify.data.matchesIndex ? receiptCopy.verified : receiptCopy.catchingUp,
                        {
                          block: verify.data.blockNumber,
                        },
                      )
                    : receiptCopy.verifying}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-subtle mb-1.5 text-sm">{receiptCopy.policyHash}</p>
                  <CopyField
                    value={data.policyHash}
                    label={receiptCopy.policyHash}
                    copiedMessage="Policy hash copied"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-subtle mb-1.5 text-sm">{receiptCopy.orderKey}</p>
                  <CopyField
                    value={data.orderKey}
                    label={receiptCopy.orderKey}
                    copiedMessage="Order key copied"
                  />
                </div>
              </div>
              {!demo && data.purchaseTx.explorerUrl ? (
                <a
                  href={data.purchaseTx.explorerUrl}
                  className="text-ink mt-4 inline-block text-sm underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  {receiptCopy.purchaseTx} · {receiptCopy.viewOnExplorer}
                </a>
              ) : null}
            </Card>
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
