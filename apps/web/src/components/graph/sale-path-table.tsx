"use client";

import type { ClientOutput } from "@spoke/protocol";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { fill, missedReasonCopy, required } from "@/lib/copy";
import { formatAmount, formatBps, formatSplit, numberWord, type TokenLike } from "@/lib/format";
import { graphCopy, salePanelCopy } from "./copy";
import { personLabel } from "./person";
import { PaidRows } from "./sale-path-paid";

export type PathEntry = ClientOutput<"graph.salePath">["nodes"][number];
type ShortPathMode = "RENORMALIZE_EXISTING" | "RETURN_UNUSED";

const reasonLine = (entry: PathEntry, position: number, max: number, self: boolean) => {
  if (entry.repeatedWallet) return { label: salePanelCopy.repeated, body: "" };
  const code = entry.reasonIfUnpaid ?? "OUTSIDE_DEPTH";
  const copy = missedReasonCopy[code];
  if (code === "CAMPAIGN_EXCLUSION") return { label: copy.label, body: "" };
  return {
    label: copy.label,
    body: fill(self ? copy.explainer : copy.otherExplainer, {
      max: String(max),
      position: String(position),
      ruleLabel: "",
    }),
  };
};

export function SalePathTable({
  saleId,
  entries,
  token,
  reward,
  maxLevels,
  shortPathMode,
  isSelf,
  compact = false,
}: {
  saleId: string;
  entries: readonly PathEntry[];
  token: TokenLike;
  reward: bigint;
  maxLevels: number;
  shortPathMode: ShortPathMode | null;
  isSelf: (entry: PathEntry) => boolean;
  compact?: boolean;
}) {
  const indexed = entries.map((entry, index) => ({ entry, level: index + 1 }));
  const rows = indexed.filter(({ entry }) => entry.paid || entry.state !== null);
  const unpaid = indexed.filter(({ entry }) => !entry.paid && entry.state === null);
  const paidCount = rows.length;
  const short = paidCount > 0 && paidCount < maxLevels && entries.length < maxLevels;
  const weights = rows.map(({ entry }) => entry.effectiveWeightBps);
  const total = rows.reduce((sum, { entry }) => sum + BigInt(entry.amount), 0n);
  const returned = reward - total;
  return (
    <div className="grid gap-4">
      <PaidRows
        saleId={saleId}
        rows={rows.map((row) => ({ ...row, self: isSelf(row.entry) }))}
        token={token}
        total={total}
        exact={total === reward}
        compact={compact}
      />
      {short && shortPathMode === "RENORMALIZE_EXISTING" ? (
        <p className="bg-sky-soft text-sky-ink rounded-xl px-4 py-3 text-sm">
          {paidCount === 1
            ? required.shortPathOne
            : fill(required.shortPath, {
                countWord: numberWord(paidCount),
                split: formatSplit(weights),
              })}
        </p>
      ) : null}
      {short && shortPathMode === "RETURN_UNUSED" && returned > 0n ? (
        <p className="bg-sky-soft text-sky-ink rounded-xl px-4 py-3 text-sm">
          {fill(required.shortPathReturned, {
            returnedPercent: formatBps(Number((returned * 10_000n) / (reward || 1n))),
            returnedAmount: formatAmount(returned, token),
          })}
        </p>
      ) : null}
      {unpaid.length > 0 ? (
        <section className="grid gap-2">
          <h3 className="text-ink text-sm font-medium">{salePanelCopy.notPaid}</h3>
          <ul className="divide-hairline bg-soft divide-y rounded-xl px-4">
            {unpaid.map(({ entry, level }) => {
              const self = isSelf(entry);
              const reason = reasonLine(entry, level, maxLevels, self);
              return (
                <li key={entry.nodeId} className="grid gap-1 py-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-ink font-medium">
                      {personLabel(entry.creator, { self, nodeId: entry.nodeId })}
                    </span>
                    <span className="text-subtle">
                      {fill(graphCopy.level, { n: String(level) })}
                    </span>
                    <span className="text-body inline-flex items-center gap-1">
                      <HugeiconsIcon
                        icon={InformationCircleIcon}
                        size={14}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      {reason.label}
                    </span>
                  </p>
                  {reason.body ? <p className="text-subtle">{reason.body}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
