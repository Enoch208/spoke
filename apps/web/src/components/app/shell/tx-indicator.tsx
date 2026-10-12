"use client";

import { Alert02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/icon-button";
import { fill, txIndicator } from "@/lib/copy";
import { useModeStore } from "@/lib/stores/mode";
import { useSessionStore } from "@/lib/stores/session";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { isActive, overallStatus } from "@/lib/tx/records";
import type { AnyTxRecord } from "@/lib/tx/types";

const needsAttention = (record: AnyTxRecord) => {
  const status = overallStatus(record);
  if (status === "needs_confirmation" || status === "unknown" || status === "interrupted")
    return true;
  return (
    (status === "failed" || status === "rejected") &&
    record.hiddenAt !== null &&
    !record.outcomeSeen
  );
};

export const indicatorRecords = (
  records: readonly AnyTxRecord[],
  mode: string,
  account: string | null,
) =>
  records.filter(
    (record) =>
      record.mode === mode &&
      (mode === "demo" ||
        (account !== null && record.account.toLowerCase() === account.toLowerCase())) &&
      (isActive(record) || needsAttention(record)),
  );

export function TxIndicator({ compact = false }: { compact?: boolean }) {
  const records = useTxStore((state) => state.records);
  const mode = useModeStore((state) => state.mode);
  const account = useSessionStore((state) => state.address);
  const open = useUiStore((state) => state.open);
  const relevant = indicatorRecords(records, mode, account);
  if (relevant.length === 0) return null;
  const attention = relevant.some(needsAttention);
  const running = relevant.filter(isActive).length;
  const show = () => {
    const only = relevant.length === 1 ? relevant[0] : undefined;
    open("M-11", only ? { txId: only.id } : { view: "list" });
  };
  const label = attention
    ? txIndicator.needsActionAria
    : fill(txIndicator.runningAria, { n: String(running) });

  if (compact) {
    return (
      <IconButton
        icon={attention ? Alert02Icon : Loading03Icon}
        label={label}
        badge={running > 0 ? String(running) : undefined}
        onClick={show}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={show}
      aria-label={label}
      className={cx(
        "font-ui inline-flex h-9 items-center gap-2 rounded-3xl px-3 text-sm font-medium",
        attention ? "bg-amber-soft text-amber-ink" : "bg-sky-soft text-sky-ink",
      )}
    >
      <HugeiconsIcon
        icon={attention ? Alert02Icon : Loading03Icon}
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className={attention ? undefined : "motion-safe:animate-spin"}
      />
      {attention ? txIndicator.needsAction : fill(txIndicator.running, { n: String(running) })}
    </button>
  );
}
