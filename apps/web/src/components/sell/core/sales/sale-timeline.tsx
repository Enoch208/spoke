"use client";

import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import type { SaleReceipt } from "@spoke/protocol";
import { TxHash } from "@/components/ui/address";
import { Card } from "@/components/ui/card";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { fill } from "@/lib/copy";
import { formatCountdown, formatDateTime } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { saleDetailCopy as copy } from "../copy/sales";

const faint = "faint" as const;

export function SaleTimeline({
  receipt,
  now,
  demo,
}: {
  receipt: SaleReceipt;
  now: number;
  demo: boolean;
}) {
  const unlock = Date.parse(receipt.unlockAt);
  const tx = (hash: string | undefined) =>
    hash ? <TxHash hash={hash} chainId={activeChain.id} demo={demo} /> : null;
  const holdOver = now >= unlock || receipt.state !== "PENDING";
  const items: TimelineItem[] = [
    {
      key: "paid",
      title: copy.paid,
      time: formatDateTime(new Date(receipt.purchasedAt)),
      meta: tx(receipt.purchaseTx.hash),
      icon: ShoppingBag01Icon,
      tone: "lime",
    },
  ];
  if (receipt.state === "REFUNDED")
    items.push({
      key: "refunded",
      title: copy.refunded,
      time: receipt.refundTx?.at ? formatDateTime(new Date(receipt.refundTx.at)) : undefined,
      meta: tx(receipt.refundTx?.hash),
      icon: ArrowTurnBackwardIcon,
      tone: "pink",
    });
  else {
    items.push({
      key: "hold",
      title: holdOver ? copy.holdEnded : copy.holdEnds,
      time: formatDateTime(new Date(receipt.unlockAt)),
      body: holdOver
        ? undefined
        : fill(copy.countdown, { time: formatCountdown(Math.floor((unlock - now) / 1000)) }),
      icon: Clock01Icon,
      tone: holdOver ? "sky" : "amber",
    });
    const finalized = receipt.state === "FINALIZED";
    items.push({
      key: "finalized",
      title: finalized ? copy.finalized : <span className="text-faint">{copy.finalized}</span>,
      time:
        finalized && receipt.finalizeTx?.at
          ? formatDateTime(new Date(receipt.finalizeTx.at))
          : undefined,
      meta: finalized ? tx(receipt.finalizeTx?.hash) : null,
      icon: CheckmarkBadge01Icon,
      tone: finalized ? "lime" : faint,
    });
    const claimed = receipt.proceedsState === "claimed";
    items.push({
      key: "claimed",
      title: claimed ? (
        copy.proceedsClaimed
      ) : (
        <span className="text-faint">{copy.proceedsClaimed}</span>
      ),
      icon: CheckmarkCircle02Icon,
      tone: claimed ? "ink" : faint,
    });
  }
  return (
    <Card padding="lg">
      <h2 className="font-display text-h4 text-ink mb-5 font-medium">{copy.timeline}</h2>
      <Timeline items={items} label={copy.timeline} />
    </Card>
  );
}
