"use client";

import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  LockKeyIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { purchaseCopy } from "../copy/purchase";
import { TxLink } from "./tx-link";

type Receipt = ClientOutput<"receipts.get">;

const events = purchaseCopy.detail.events;

export function TimelineCard({
  receipt,
  now,
  demo,
}: {
  receipt: Receipt;
  now: number;
  demo: boolean;
}) {
  const unlock = new Date(receipt.unlockAt);
  const reached = now >= unlock.getTime();
  const unlockTime = formatDateTime(unlock, { now: new Date(now) });
  const time = (at: string | undefined) => (at ? formatDateTime(new Date(at)) : undefined);
  const items: TimelineItem[] = [
    {
      key: "purchased",
      title: events.purchased,
      time: time(receipt.purchasedAt),
      icon: ShoppingBag01Icon,
      tone: "lilac",
      meta: (
        <TxLink tx={receipt.purchaseTx} demo={demo} label={purchaseCopy.detail.keys.purchaseTx} />
      ),
    },
    ...(receipt.allocations.length > 0
      ? [
          {
            key: "reserved",
            title: events.reserved,
            time: time(receipt.purchasedAt),
            icon: LockKeyIcon,
            tone: "lilac" as const,
          },
        ]
      : []),
  ];
  if (receipt.state === "REFUNDED")
    items.push({
      key: "refunded",
      title: events.refunded,
      time: time(receipt.refundTx?.at),
      icon: ArrowTurnBackwardIcon,
      tone: "pink",
      meta: <TxLink tx={receipt.refundTx} demo={demo} label={purchaseCopy.detail.viewRefund} />,
    });
  else {
    items.push({
      key: "hold",
      title: fill(reached ? events.holdEnded : events.holdEnds, { unlockTime }),
      icon: Clock01Icon,
      tone: reached ? "amber" : "faint",
    });
    if (receipt.state === "FINALIZED")
      items.push({
        key: "finalized",
        title: events.finalized,
        time: time(receipt.finalizeTx?.at),
        icon: CheckmarkBadge01Icon,
        tone: "lime",
        meta: (
          <TxLink tx={receipt.finalizeTx} demo={demo} label={purchaseCopy.detail.viewFinalize} />
        ),
      });
  }
  return (
    <section className="bg-surface border-hairline flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
      <h2 className="text-ink font-medium">{purchaseCopy.detail.timeline}</h2>
      <Timeline label={purchaseCopy.detail.timeline} items={items} />
    </section>
  );
}
