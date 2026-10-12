import type { SaleStatus } from "@spoke/protocol";
import { StatusChip } from "@/components/ui/status-chip";
import { earningsBucketCopy, saleStateCopy } from "@/lib/copy";
import { saleStateKey, shareBucket, type ShareState } from "@/lib/domain/sale-state";

export function SaleStateChip({
  status,
  unlockAt,
  size = "sm",
}: {
  status: SaleStatus;
  unlockAt?: string | null | undefined;
  size?: "sm" | "md";
}) {
  const copy = saleStateCopy[saleStateKey(status, unlockAt)];
  return <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} size={size} />;
}

export function ShareStateChip({
  state,
  unlockAt,
}: {
  state: ShareState;
  unlockAt?: string | null | undefined;
}) {
  const copy = earningsBucketCopy[shareBucket(state, unlockAt)];
  return <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} />;
}
