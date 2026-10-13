import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CommissionPolicy } from "@spoke/protocol";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { fill } from "@/lib/copy";
import {
  formatAmount,
  formatBps,
  formatSplit,
  numberWord,
  pluralize,
  type TokenLike,
} from "@/lib/format";
import { routes } from "@/lib/routes";
import { splitCopy } from "../copy/split";
import { isCapped, rewardAtPrice, splitAtPrice, uncappedReward } from "../shared/policy-math";

function LevelPill({
  level,
  weight,
  amount,
  token,
}: {
  level: number;
  weight: number;
  amount: bigint;
  token: TokenLike;
}) {
  return (
    <div
      className={cx(
        "flex min-w-0 flex-col gap-0.5 rounded-2xl border px-3 py-2.5 max-sm:flex-row max-sm:items-baseline max-sm:justify-between max-sm:gap-3",
        level === 1 ? "bg-lime border-lime text-olive" : "border-olive/30 text-ink bg-surface",
      )}
    >
      <span className="text-sm font-medium">{fill(splitCopy.level, { level: String(level) })}</span>
      <span className="font-mono text-sm tabular-nums">{formatBps(weight)}</span>
      <span className="truncate font-mono text-sm tabular-nums sm:text-base">
        {formatAmount(amount, token)}
      </span>
    </div>
  );
}

function Arrow() {
  return (
    <HugeiconsIcon
      icon={ArrowRight01Icon}
      size={16}
      strokeWidth={1.8}
      aria-hidden="true"
      className="text-faint shrink-0"
    />
  );
}

function Endpoint({ label }: { label: string }) {
  return (
    <span className="bg-pill text-ink flex h-10 shrink-0 items-center rounded-3xl px-3.5 text-sm font-medium">
      {label}
    </span>
  );
}

function ShorterPaths({
  price,
  policy,
  token,
}: {
  price: bigint;
  policy: CommissionPolicy;
  token: TokenLike;
}) {
  const levels = Array.from({ length: policy.maxRewardedAncestors }, (_, index) => index + 1);
  const returns = policy.shortPathMode === "RETURN_UNUSED";
  const rows = levels
    .slice(0, -1)
    .map((length) => ({ length, ...splitAtPrice(price, policy, length) }));
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-ink text-base font-medium">{splitCopy.shorterHeading}</h3>
      <ul className="divide-hairline flex flex-col divide-y text-sm sm:hidden">
        {rows.map((row) => (
          <li key={row.length} className="flex flex-col gap-0.5 py-2.5">
            <span className="text-subtle">{pluralize(row.length, "person", "people")}</span>
            <span className="text-ink font-mono tabular-nums">
              {row.amounts.map((amount) => formatAmount(amount, token)).join(" · ")}
            </span>
            {returns ? (
              <span className="text-subtle">
                {splitCopy.returned}:{" "}
                <span className="font-mono tabular-nums">
                  {formatAmount(row.unallocated, token)}
                </span>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <Table caption={splitCopy.shorterCaption} className="hidden sm:block">
        <THead>
          <tr>
            <Th>{splitCopy.people}</Th>
            {levels.map((level) => (
              <Th key={level} numeric>
                {fill(splitCopy.level, { level: String(level) })}
              </Th>
            ))}
            {returns ? <Th numeric>{splitCopy.returned}</Th> : null}
          </tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <Tr key={row.length}>
              <Td className="font-mono tabular-nums">{row.length}</Td>
              {levels.map((level) => {
                const amount = row.amounts[level - 1];
                return (
                  <Td key={level} numeric className={amount === undefined ? "text-faint" : ""}>
                    {amount === undefined ? "–" : formatAmount(amount, token)}
                  </Td>
                );
              })}
              {returns ? <Td numeric>{formatAmount(row.unallocated, token)}</Td> : null}
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

export function RewardSplit({
  price,
  policy,
  token,
  merchant,
}: {
  price: bigint;
  policy: CommissionPolicy;
  token: TokenLike;
  merchant: string;
}) {
  const reward = rewardAtPrice(price, policy);
  const full = splitAtPrice(price, policy);
  const nearestFirst = full.amounts.map((amount, index) => ({
    level: index + 1,
    amount,
    weight: full.weightsBps[index] ?? 0,
  }));
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <h2 className="font-display text-h4 text-ink font-medium">{splitCopy.heading}</h2>
      <div className="hidden items-center gap-2 sm:flex">
        <Endpoint label={splitCopy.merchant} />
        <Arrow />
        <ol
          className="grid min-w-0 flex-1 gap-2"
          style={{ gridTemplateColumns: `repeat(${String(nearestFirst.length)}, minmax(0, 1fr))` }}
        >
          {[...nearestFirst].reverse().map((entry) => (
            <li key={entry.level} className="min-w-0">
              <LevelPill {...entry} token={token} />
            </li>
          ))}
        </ol>
        <Arrow />
        <Endpoint label={splitCopy.buyer} />
      </div>
      <ol className="flex flex-col gap-2 sm:hidden">
        {nearestFirst.map((entry) => (
          <li key={entry.level}>
            <LevelPill {...entry} token={token} />
          </li>
        ))}
      </ol>
      <div className="text-body flex flex-col gap-2 text-sm">
        <p>
          {nearestFirst.length === 1
            ? splitCopy.fullPathOne
            : fill(splitCopy.fullPath, {
                split: formatSplit(full.weightsBps),
                count: numberWord(nearestFirst.length),
              })}
        </p>
        {isCapped(price, policy) ? (
          <p>
            {fill(splitCopy.capped, {
              rate: formatBps(policy.commissionBps),
              price: formatAmount(price, token),
              uncapped: formatAmount(uncappedReward(price, policy), token),
              cap: formatAmount(BigInt(policy.perSaleCap), token),
            })}
          </p>
        ) : null}
      </div>
      <ShorterPaths price={price} policy={policy} token={token} />
      <div className="text-subtle flex flex-col gap-1.5 text-sm">
        <p>
          {fill(splitCopy.footnote, { reward: formatAmount(reward, token) })}
          {policy.shortPathMode === "RETURN_UNUSED" ? ` ${splitCopy.footnoteReturn}` : ""}
        </p>
        <p>{fill(splitCopy.paidFrom, { merchant })}</p>
        <Link href={`${routes.trust}#math`} className="text-ink w-fit underline underline-offset-2">
          {splitCopy.howMath}
        </Link>
      </div>
    </Card>
  );
}
