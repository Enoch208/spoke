"use client";

import type { ClientOutput } from "@spoke/protocol";
import { FileSyncIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { fill, required } from "@/lib/copy";
import {
  formatAmount,
  formatBps,
  formatDateTime,
  formatDuration,
  formatSplit,
  numberWord,
  type TokenLike,
} from "@/lib/format";
import { linkDetailCopy } from "../copy/link-detail";
import { PolicySummary, splitFor, type PolicyVersion } from "../shared/policy";
import { Section } from "../shared/section";

const copy = linkDetailCopy.pays;

const throughLabel = (index: number) =>
  index === 0 ? copy.own : index === 1 ? copy.under : fill(copy.deeper, { n: String(index) });

function TermsChanging({
  campaign,
  current,
  next,
}: {
  campaign: string;
  current: PolicyVersion;
  next: PolicyVersion;
}) {
  const t = linkDetailCopy.terms;
  const changes = [
    current.commissionBps !== next.commissionBps
      ? fill(t.commission, {
          before: formatBps(current.commissionBps),
          after: formatBps(next.commissionBps),
        })
      : null,
    current.holdSeconds !== next.holdSeconds
      ? fill(t.hold, {
          before: formatDuration(current.holdSeconds),
          after: formatDuration(next.holdSeconds),
        })
      : null,
    formatSplit(current.weightsBps) !== formatSplit(next.weightsBps)
      ? fill(t.levels, {
          before: formatSplit(current.weightsBps),
          after: formatSplit(next.weightsBps),
        })
      : null,
  ].filter((line) => line !== null);
  return (
    <div className="bg-amber-soft text-amber-ink grid gap-1 rounded-xl px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <HugeiconsIcon icon={FileSyncIcon} size={16} strokeWidth={1.8} aria-hidden="true" />
        {fill(t.title, { campaign })}
      </p>
      <p>{fill(t.body, { effectiveAt: formatDateTime(new Date(next.effectiveAt)) })}</p>
      {changes.length > 0 ? <p>{changes.join(" · ")}</p> : null}
    </div>
  );
}

export function PaysYou({
  policy,
  price,
  token,
  level,
  campaign,
}: {
  policy: ClientOutput<"campaigns.policy">;
  price: bigint;
  token: TokenLike;
  level: number;
  campaign: string;
}) {
  const version = policy.current;
  const max = version.maxRewardedAncestors;
  const rows = Array.from({ length: max }, (_, index) => {
    const eligible = Math.min(level + index, max);
    const split = splitFor(price, version, eligible);
    return {
      index,
      weight: split.weightsBps[index] ?? 0,
      amount: split.amounts[index] ?? 0n,
    };
  });
  const own = splitFor(price, version, Math.min(level, max));
  const short = level < max;
  return (
    <Section title={copy.title}>
      <div className="grid gap-4">
        {policy.scheduled ? (
          <TermsChanging campaign={campaign} current={version} next={policy.scheduled} />
        ) : null}
        <PolicySummary version={version} token={token} />
        <ul aria-label={copy.caption} className="divide-hairline divide-y sm:hidden">
          {rows.map((row) => (
            <li key={row.index} className="grid gap-0.5 py-2.5 text-sm">
              <span className="text-ink font-medium">{throughLabel(row.index)}</span>
              <span className="text-body flex justify-between gap-3">
                <span>
                  {fill(copy.level, { n: String(row.index + 1) })} · {formatBps(row.weight)}
                </span>
                <span className="text-ink font-mono tabular-nums">
                  {formatAmount(row.amount, token)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <Table caption={copy.caption} className="max-sm:hidden">
          <THead>
            <tr>
              <Th>{copy.through}</Th>
              <Th>{copy.yourLevel}</Th>
              <Th numeric>{copy.share}</Th>
              <Th numeric>{copy.amount}</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <Tr key={row.index}>
                <Td className="text-body">{throughLabel(row.index)}</Td>
                <Td className="text-body whitespace-nowrap">
                  {fill(copy.level, { n: String(row.index + 1) })}
                </Td>
                <Td numeric>{formatBps(row.weight)}</Td>
                <Td numeric className="whitespace-nowrap">
                  {formatAmount(row.amount, token)}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
        <p className="text-subtle text-sm">
          {fill(copy.example, { price: formatAmount(price, token, { testnet: true }) })}
        </p>
        {short ? (
          <p className="bg-sky-soft text-sky-ink rounded-xl px-4 py-3 text-sm">
            {level === 1 && version.shortPathMode === "RENORMALIZE_EXISTING"
              ? required.shortPathOne
              : fill(
                  version.shortPathMode === "RENORMALIZE_EXISTING"
                    ? copy.shortRenormalize
                    : copy.shortReturn,
                  { count: numberWord(level), split: formatSplit(own.weightsBps) },
                )}
          </p>
        ) : null}
      </div>
    </Section>
  );
}
