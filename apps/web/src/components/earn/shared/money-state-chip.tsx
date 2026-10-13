"use client";

import { ShareStateChip } from "@/components/product/state-chips";
import { formatDateTime, shortHash } from "@/lib/format";
import { shareBucket, type ShareState } from "@/lib/domain/sale-state";
import { fill } from "@/lib/copy";
import { moneyQualifiers } from "../copy/money";

export function MoneyStateChip({
  state,
  unlockAt,
  finalizedAt,
  claimTxHash,
  now,
}: {
  state: ShareState;
  unlockAt: string;
  finalizedAt?: string | null;
  claimTxHash?: string | null;
  now: number;
}) {
  const bucket = shareBucket(state, unlockAt, new Date(now));
  const at = (iso: string) => formatDateTime(new Date(iso), { now: new Date(now) });
  const qualifier =
    bucket === "atRisk"
      ? fill(moneyQualifiers.atRisk, { time: at(unlockAt) })
      : bucket === "readyToFinalize"
        ? fill(moneyQualifiers.readyToFinalize, { time: at(unlockAt) })
        : bucket === "claimable" && finalizedAt
          ? fill(moneyQualifiers.claimable, { time: at(finalizedAt) })
          : bucket === "claimed" && claimTxHash
            ? fill(moneyQualifiers.claimed, { hash: shortHash(claimTxHash) })
            : null;
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <ShareStateChip state={state} unlockAt={unlockAt} />
      {qualifier ? <span className="text-subtle text-xs">{qualifier}</span> : null}
    </span>
  );
}
