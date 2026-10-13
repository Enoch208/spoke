import type { CommissionPolicy } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import {
  formatAmount,
  formatBps,
  formatDateTime,
  formatDuration,
  formatSplit,
  type TokenLike,
} from "@/lib/format";
import { studioCopy } from "../studio/copy";
import { newTermsCopy } from "./copy-launch";
import { localToMs } from "./derive-rules";
import { earliestEffective } from "./setup-version";

const fields = newTermsCopy.fields;

const shortPath = (mode: CommissionPolicy["shortPathMode"]) =>
  mode === "RENORMALIZE_EXISTING"
    ? studioCopy.shortPath.renormalize
    : studioCopy.shortPath.returnUnused;

export const versionChanges = (
  current: CommissionPolicy,
  next: CommissionPolicy | null,
  token: TokenLike,
): string[] => {
  if (!next) return [];
  const rows: [string, string, string][] = [
    [fields.commissionBps, formatBps(current.commissionBps), formatBps(next.commissionBps)],
    [
      fields.perSaleCap,
      formatAmount(BigInt(current.perSaleCap), token),
      formatAmount(BigInt(next.perSaleCap), token),
    ],
    [
      fields.maxRewardedAncestors,
      String(current.maxRewardedAncestors),
      String(next.maxRewardedAncestors),
    ],
    [fields.weightsBps, formatSplit(current.weightsBps), formatSplit(next.weightsBps)],
    [fields.shortPathMode, shortPath(current.shortPathMode), shortPath(next.shortPathMode)],
    [fields.holdSeconds, formatDuration(current.holdSeconds), formatDuration(next.holdSeconds)],
  ];
  return rows
    .filter(([, before, after]) => before !== after)
    .map(([field, before, after]) => fill(newTermsCopy.change, { field, before, after }));
};

export const effectiveError = (local: string, endsAt: number, now: number) => {
  const copy = newTermsCopy.errors;
  const at = localToMs(local);
  if (at === null) return copy.invalidDate;
  const earliest = earliestEffective(now);
  if (at < earliest) return fill(copy.notice, { earliest: formatDateTime(new Date(earliest)) });
  return at >= endsAt
    ? fill(copy.afterEnd, { endsAt: formatDateTime(new Date(endsAt)) })
    : undefined;
};
