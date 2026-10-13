import type { CommissionPolicy } from "@spoke/protocol";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import {
  formatAmount,
  formatBps,
  formatCountdown,
  formatSplit,
  numberWord,
  pluralize,
  type TokenLike,
} from "@/lib/format";
import { referralCopy } from "../copy/referral";
import { actorName, isSelfActor } from "../shared/actor";
import { rewardAtPrice } from "../shared/policy-math";
import { pathSplit, projectionSplit, type PathEntry } from "./path-math";

export function LevelRow({
  level,
  person,
  relation,
  weight,
  amount,
  token,
}: {
  level: number;
  person: string;
  relation?: string | undefined;
  weight: number;
  amount: bigint;
  token: TokenLike;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-full font-mono tabular-nums",
          level === 1 ? "bg-lime text-olive" : "bg-pill text-ink",
        )}
        aria-label={fill(referralCopy.level, { level: String(level) })}
      >
        {level}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate font-medium">{person}</span>
        {relation ? <span className="text-subtle block">{relation}</span> : null}
      </span>
      <span className="text-subtle shrink-0 font-mono tabular-nums">{formatBps(weight)}</span>
      <span className="text-ink shrink-0 text-right font-mono tabular-nums">
        {formatAmount(amount, token)}
      </span>
    </li>
  );
}

function Notes({ lines }: { lines: readonly ReactNode[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="text-body flex flex-col gap-1.5 text-sm">
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}

export function RewardGoes({
  price,
  policy,
  token,
  merchant,
  path,
  self,
}: {
  price: bigint;
  policy: CommissionPolicy;
  token: TokenLike;
  merchant: string;
  path: readonly PathEntry[];
  self: string | null;
}) {
  const reward = rewardAtPrice(price, policy);
  const split = pathSplit(price, policy, path);
  const count = split.rows.length;
  const returns = policy.shortPathMode === "RETURN_UNUSED";
  const notes: ReactNode[] = [];
  if (split.short && count === 1)
    notes.push(
      returns
        ? fill(referralCopy.oneReturn, {
            share: formatBps(split.weightsBps[0] ?? 0),
            returned: formatAmount(split.returned, token),
          })
        : referralCopy.oneRenormalize,
    );
  else if (split.short && count > 1)
    notes.push(
      fill(returns ? referralCopy.shortReturn : referralCopy.shortRenormalize, {
        count: numberWord(count),
        split: formatSplit(split.weightsBps),
        returned: formatAmount(split.returned, token),
      }),
    );
  if (split.outside.length > 0)
    notes.push(
      fill(referralCopy.outsideWindow, {
        count: pluralize(split.outside.length, "more person", "more people"),
        paid: String(policy.maxRewardedAncestors),
      }),
    );
  for (const entry of split.repeated)
    notes.push(fill(referralCopy.repeated, { person: actorName(entry.creator, { self }) }));
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-display text-h4 text-ink font-medium">{referralCopy.rewardGoes}</h2>
      <p className="text-body text-sm">
        {fill(referralCopy.rewardIntro, {
          reward: formatAmount(reward, token),
          rate: formatBps(policy.commissionBps),
          merchant,
        })}
      </p>
      <ol className="divide-hairline flex flex-col divide-y">
        {split.rows.map((row) => (
          <LevelRow
            key={row.entry.nodeId}
            level={row.level}
            person={actorName(row.entry.creator, { self })}
            relation={
              isSelfActor(row.entry.creator, self)
                ? undefined
                : row.level === 1
                  ? referralCopy.sharedIt
                  : referralCopy.passedOn
            }
            weight={row.weight}
            amount={row.amount}
            token={token}
          />
        ))}
        {returns && split.returned > 0n ? (
          <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-subtle">{referralCopy.returnedRow}</span>
            <span className="text-ink font-mono tabular-nums">
              {formatAmount(split.returned, token)}
            </span>
          </li>
        ) : null}
      </ol>
      <Notes lines={notes} />
      <p className="text-subtle text-sm">
        {fill(referralCopy.settlesFooter, { hold: formatCountdown(policy.holdSeconds) })}
      </p>
    </Card>
  );
}

export function PassItOn({
  price,
  policy,
  token,
  path,
  self,
}: {
  price: bigint;
  policy: CommissionPolicy;
  token: TokenLike;
  path: readonly PathEntry[];
  self: string | null;
}) {
  const projection = projectionSplit(price, policy, path);
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-display text-h4 text-ink font-medium">{referralCopy.passItOn}</h2>
      <p className="text-body text-sm">{referralCopy.projection}</p>
      <ol className="divide-hairline flex flex-col divide-y">
        <LevelRow
          level={1}
          person={referralCopy.you}
          weight={projection.viewer.weight}
          amount={projection.viewer.amount}
          token={token}
        />
        {projection.rows.map((row) => (
          <LevelRow
            key={row.entry.nodeId}
            level={row.level}
            person={actorName(row.entry.creator, { self })}
            weight={row.weight}
            amount={row.amount}
            token={token}
          />
        ))}
      </ol>
      <div className="text-body flex flex-col gap-1.5 text-sm">
        {projection.dropped ? (
          <p>
            {fill(referralCopy.droppedOut, {
              person: actorName(projection.dropped.creator, { self }),
            })}
          </p>
        ) : null}
        <p className="text-subtle">{referralCopy.freeToCreate}</p>
      </div>
    </Card>
  );
}
