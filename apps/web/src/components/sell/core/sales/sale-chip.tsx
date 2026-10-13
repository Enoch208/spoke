import type { SaleStatus } from "@spoke/protocol";
import { StatusChip } from "@/components/ui/status-chip";
import { fill, saleStateCopy, type SaleStateKey } from "@/lib/copy";
import { saleStateKey } from "@/lib/domain/sale-state";
import { formatCountdown } from "@/lib/format";
import { salesCopy } from "../copy/sales";

export type ProceedsState = "pending" | "claimable" | "claimed" | "refunded";

export const merchantSaleKey = (
  state: SaleStatus,
  unlockAt: string,
  proceedsState: ProceedsState,
  now: number,
): SaleStateKey =>
  state === "FINALIZED" && proceedsState === "claimed"
    ? "proceedsClaimed"
    : saleStateKey(state, unlockAt, new Date(now));

export const canRefundSale = (state: SaleStatus, unlockAt: string, now: number) =>
  state === "PENDING" && now < Date.parse(unlockAt);

export const canFinalizeSale = (state: SaleStatus, unlockAt: string, now: number) =>
  state === "PENDING" && now >= Date.parse(unlockAt);

export function MerchantSaleChip({
  stateKey,
  unlockAt,
  now,
  size = "sm",
  showCountdown = true,
}: {
  stateKey: SaleStateKey;
  unlockAt: string;
  now: number;
  size?: "sm" | "md";
  showCountdown?: boolean;
}) {
  const copy = saleStateCopy[stateKey];
  const seconds = Math.floor((Date.parse(unlockAt) - now) / 1000);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} size={size} />
      {showCountdown && stateKey === "pending" && seconds > 0 ? (
        <span className="text-amber-ink text-xs whitespace-nowrap">
          {fill(salesCopy.leftToRefund, { time: formatCountdown(seconds) })}
        </span>
      ) : null}
    </span>
  );
}
