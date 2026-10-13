"use client";

import type { ClientOutput, EarningsBucket } from "@spoke/protocol";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { toneClasses } from "@/components/ui/tone";
import { useClientContext } from "@/lib/client/provider";
import { earningsBucketCopy, fill, txOverallStatus } from "@/lib/copy";
import { formatAmount, formatRelative } from "@/lib/format";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { isActive, overallStatus } from "@/lib/tx/records";
import { useNow } from "@/lib/use-now";
import { tilesCopy } from "../copy/earnings";
import { sameAddress } from "./viewer";

type TokenRow = ClientOutput<"earnings.summary">["tokens"][number];

function Tile({
  bucket,
  amount,
  compact,
  children,
  className,
}: {
  bucket: EarningsBucket;
  amount: string;
  compact: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const copy = earningsBucketCopy[bucket];
  return (
    <div
      className={cx(
        "bg-surface border-hairline flex min-w-0 flex-col gap-2 rounded-2xl border",
        compact ? "p-4" : "p-4 sm:p-5",
        bucket === "claimable" && "bg-lime-soft border-transparent",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <span className={cx("inline-flex", toneClasses[copy.tone].text)} aria-hidden="true">
          <HugeiconsIcon icon={copy.icon} size={16} strokeWidth={2} />
        </span>
        <span className="text-ink">{copy.totalLabel}</span>
      </p>
      <p
        className={cx(
          "text-ink flex flex-wrap items-baseline gap-x-2 font-mono tabular-nums",
          compact ? "text-lg" : "text-xl sm:text-2xl",
        )}
      >
        {amount.split("\u00a0").map((part) => (
          <span key={part}>{part}</span>
        ))}
      </p>
      {compact ? null : <p className="text-subtle text-sm">{tilesCopy[bucket]}</p>}
      {children}
    </div>
  );
}

export function EarningsTiles({
  row,
  claimableAmount,
  nextUnlockAt,
  compact = false,
}: {
  row: TokenRow;
  claimableAmount?: string | undefined;
  nextUnlockAt: string | null;
  compact?: boolean;
}) {
  const { mode } = useClientContext();
  const now = useNow();
  const open = useUiStore((state) => state.open);
  const claimRecord = useTxStore((state) =>
    state.records.find(
      (record) =>
        record.kind === "claimRewards" &&
        sameAddress(record.params.token, row.token.address) &&
        isActive(record),
    ),
  );
  const money = (value: string | bigint, testnet = false) =>
    formatAmount(BigInt(value), row.token, { testnet });
  const pending = BigInt(row.atRisk) + BigInt(row.readyToFinalize);
  const claimable = claimableAmount ?? row.claimable;
  const rest: EarningsBucket[] =
    mode === "demo" ? ["claimed", "refunded", "reversed"] : ["claimed", "refunded"];
  const lastFull = rest.length % 2 === 1;
  const unlock = nextUnlockAt && Date.parse(nextUnlockAt) > now ? nextUnlockAt : null;
  return (
    <div
      role="group"
      aria-label={tilesCopy.label}
      className="grid grid-cols-2 gap-3 lg:grid-cols-3"
    >
      <div className="bg-pill col-span-2 grid gap-2 rounded-3xl p-2">
        <p className="text-body flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-1.5 text-sm">
          <span className="text-ink font-medium">{tilesCopy.pendingHeader}</span>
          <span className="text-ink font-mono tabular-nums">· {money(pending, true)}</span>
          {mode === "demo" ? <Badge tone="lilac">{tilesCopy.demo}</Badge> : null}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Tile bucket="atRisk" amount={money(row.atRisk)} compact={compact}>
            {unlock ? (
              <p className="text-amber-ink text-sm">
                {fill(tilesCopy.nextHold, {
                  time: formatRelative(new Date(unlock), { now: new Date(now) }),
                })}
              </p>
            ) : null}
          </Tile>
          <Tile bucket="readyToFinalize" amount={money(row.readyToFinalize)} compact={compact}>
            {BigInt(row.readyToFinalize) > 0n ? (
              <Link
                href="/earn/payouts#finalize"
                className="text-ink text-sm font-medium underline underline-offset-2"
              >
                {tilesCopy.finalize}
              </Link>
            ) : null}
          </Tile>
        </div>
      </div>
      <Tile
        bucket="claimable"
        amount={money(claimable)}
        compact={compact}
        className={cx("max-lg:col-span-2", claimRecord && "opacity-60")}
      >
        {claimRecord ? (
          <p className="text-lime-ink text-sm">{txOverallStatus[overallStatus(claimRecord)]}</p>
        ) : BigInt(claimable) > 0n || BigInt(row.readyToFinalize) > 0n ? (
          <Button
            size="sm"
            className="self-start max-sm:w-full"
            onClick={() => open("M-21", { source: "REWARD", token: row.token.address })}
          >
            {fill(tilesCopy.claim, { amount: money(claimable) })}
          </Button>
        ) : null}
        {mode === "live" && claimableAmount ? (
          <p className="text-lime-ink text-xs">{tilesCopy.chainRead}</p>
        ) : null}
      </Tile>
      {rest.map((bucket, index) => (
        <Tile
          key={bucket}
          bucket={bucket}
          amount={money(row[bucket])}
          compact={compact}
          className={cx(lastFull && index === rest.length - 1 && "max-lg:col-span-2")}
        />
      ))}
    </div>
  );
}
