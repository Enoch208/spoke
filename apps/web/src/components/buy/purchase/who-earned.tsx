"use client";

import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  LockKeyIcon,
} from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import { modalRegistry } from "@/components/app/modal-registry";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps, formatPerson } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { purchaseCopy } from "../copy/purchase";
import { Disclosure } from "../checkout/summary/disclosure";

type Receipt = ClientOutput<"receipts.get">;
type Allocation = Receipt["allocations"][number];

const copy = purchaseCopy.detail;

const chipFor = (allocation: Allocation) => {
  if (allocation.state === "refunded" || allocation.state === "reversed")
    return {
      label: purchaseCopy.allocation.refunded,
      icon: ArrowTurnBackwardIcon,
      tone: "pink" as const,
    };
  if (allocation.state === "reserved")
    return { label: purchaseCopy.allocation.reserved, icon: LockKeyIcon, tone: "lilac" as const };
  return {
    label: purchaseCopy.allocation.settled,
    icon: CheckmarkBadge01Icon,
    tone: "lime" as const,
  };
};

export function WhoEarned({ receipt, collapsible }: { receipt: Receipt; collapsible: boolean }) {
  const reward = formatAmount(BigInt(receipt.rewardReserved), receipt.token);
  const count = receipt.allocations.length;
  const pathAvailable = Boolean(modalRegistry["M-16"]);
  return (
    <Disclosure
      title={copy.whoEarned}
      collapsible={collapsible && count > 0}
      summary={
        receipt.state === "REFUNDED"
          ? copy.whoEarnedRefunded
          : count === 1
            ? fill(copy.whoEarnedCollapsedOne, { reward })
            : fill(copy.whoEarnedCollapsed, { n: String(count), reward })
      }
    >
      {count === 0 ? (
        <p className="text-body text-sm">{copy.direct}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <ol className="divide-hairline border-hairline divide-y border-y">
            {receipt.allocations.map((allocation) => {
              const chip = chipFor(allocation);
              return (
                <li key={allocation.level} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar
                    seed={allocation.recipient.address ?? String(allocation.level)}
                    name={allocation.recipient.handle ?? allocation.recipient.displayName}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate text-sm font-medium">
                      {formatPerson(allocation.recipient)}
                    </p>
                    <p className="text-subtle text-sm">
                      {fill(copy.level, { level: String(allocation.level) })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-ink font-mono text-sm tabular-nums">
                      {formatBps(allocation.effectiveWeightBps)} ·{" "}
                      {formatAmount(BigInt(allocation.amount), receipt.token)}
                    </p>
                    <StatusChip label={chip.label} icon={chip.icon} tone={chip.tone} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-ink text-sm">{fill(copy.rewardTotal, { reward })}</p>
          <p className="text-subtle text-sm">{copy.paidByMerchant}</p>
          {pathAvailable ? (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => {
                useUiStore.getState().open("M-16", { saleId: receipt.saleId });
              }}
            >
              {copy.seePath}
            </Button>
          ) : null}
        </div>
      )}
    </Disclosure>
  );
}
