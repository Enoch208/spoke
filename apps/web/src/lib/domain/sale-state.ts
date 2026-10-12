import type { SaleStatus } from "@spoke/protocol";
import { saleStateKeyByStatus, type SaleStateKey } from "@/lib/copy";

export type ShareState = "reserved" | "claimable" | "claimed" | "refunded" | "reversed";

export type ShareBucket =
  "atRisk" | "readyToFinalize" | "claimable" | "claimed" | "refunded" | "reversed";

const holdEnded = (unlockAt: string | null | undefined, now: Date) =>
  unlockAt !== null && unlockAt !== undefined && new Date(unlockAt).getTime() <= now.getTime();

export const saleStateKey = (
  status: SaleStatus,
  unlockAt: string | null | undefined,
  now: Date = new Date(),
): SaleStateKey =>
  status === "PENDING" && holdEnded(unlockAt, now)
    ? "readyToFinalize"
    : saleStateKeyByStatus[status];

export const shareBucket = (
  state: ShareState,
  unlockAt: string | null | undefined,
  now: Date = new Date(),
): ShareBucket => {
  if (state !== "reserved") return state;
  return holdEnded(unlockAt, now) ? "readyToFinalize" : "atRisk";
};
