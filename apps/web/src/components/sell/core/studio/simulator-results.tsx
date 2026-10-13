"use client";

import type { CommissionPolicy } from "@spoke/protocol";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { fill, required } from "@/lib/copy";
import { formatAmount, formatBps, formatSplit, numberWord, type TokenLike } from "@/lib/format";
import { studioCopy } from "./copy";
import { previewCopy } from "./copy-preview";
import { simulatorCopy } from "./copy-simulator";
import { splitPreview } from "./split";

const copy = simulatorCopy;

export type Scenario = {
  readonly pathLength: number;
  readonly buyerOnPath: boolean;
  readonly sameWallet: boolean;
  readonly budgetMinor: bigint | null;
};

function Blocked({ lines }: { lines: readonly string[] }) {
  return (
    <div
      role="status"
      className="bg-amber-soft text-amber-ink flex flex-col gap-1 rounded-xl px-3 py-2.5 text-sm"
    >
      {lines.map((line) => (
        <p key={line} className="flex items-start gap-2">
          <HugeiconsIcon
            icon={Alert01Icon}
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
          />
          {line}
        </p>
      ))}
    </div>
  );
}

const shortLine = (
  present: number,
  levels: number,
  weights: readonly number[],
  returned: bigint,
  token: TokenLike,
) => {
  if (present >= levels)
    return levels === 1
      ? required.splitPreviewOne
      : fill(required.splitPreview, {
          split: formatSplit(weights),
          levelsWord: numberWord(levels),
        });
  if (returned > 0n) return fill(copy.unusedStays, { amount: formatAmount(returned, token) });
  return present === 1
    ? required.shortPathOne
    : fill(required.shortPath, { countWord: numberWord(present), split: formatSplit(weights) });
};

export function SimulatorResults({
  policy,
  priceMinor,
  scenario,
  token,
}: {
  policy: CommissionPolicy | null;
  priceMinor: bigint | null;
  scenario: Scenario;
  token: TokenLike;
}) {
  if (!policy || priceMinor === null)
    return (
      <p className="bg-soft text-subtle rounded-xl px-3 py-4 text-center text-sm">
        {previewCopy.dimmed}
      </p>
    );
  if (scenario.sameWallet) return <Blocked lines={[copy.sameWalletResult]} />;
  if (scenario.buyerOnPath) return <Blocked lines={[required.selfReferral, copy.buyDirectly]} />;
  const preview = splitPreview(priceMinor, policy, scenario.pathLength);
  if (scenario.budgetMinor !== null && scenario.budgetMinor < preview.reward)
    return <Blocked lines={[required.budgetDepleted, copy.buyWithout]} />;
  const present = preview.amounts.length;
  const outside = Math.max(0, scenario.pathLength - preview.levels);
  return (
    <div aria-live="polite" className="flex flex-col gap-3">
      <p className="text-ink font-display text-h4 font-medium">
        {fill(copy.reward, { reward: formatAmount(preview.reward, token) })}
      </p>
      <table className="w-full text-sm">
        <caption className="sr-only">{copy.results}</caption>
        <tbody>
          {preview.amounts.map((amount, index) => {
            const weight = preview.weightsBps[index] ?? 0;
            return (
              <tr key={String(index)} className="border-hairline border-t first:border-t-0">
                <th scope="row" className="text-body w-24 py-2 text-left font-normal">
                  {fill(studioCopy.weights.short, { level: String(index + 1) })}
                </th>
                <td className="py-2 pr-3">
                  <div aria-hidden="true" className="bg-pill h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-ink h-full origin-left rounded-full"
                      style={{ transform: `scaleX(${String(weight / 10_000)})` }}
                    />
                  </div>
                  <span className="text-subtle text-xs">
                    {fill(copy.share, { share: formatBps(weight) })}
                  </span>
                </td>
                <td className="text-ink py-2 text-right font-mono tabular-nums">
                  {formatAmount(amount, token)}
                </td>
              </tr>
            );
          })}
          {Array.from({ length: outside }, (_, index) => (
            <tr key={`outside-${String(index)}`} className="border-hairline border-t">
              <th scope="row" className="text-faint py-2 text-left font-normal">
                {fill(studioCopy.weights.short, { level: String(preview.levels + index + 1) })}
              </th>
              <td className="text-faint py-2 text-xs" colSpan={2}>
                {copy.outside}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {preview.remainder !== 0n ? (
        <p className="text-subtle text-sm">
          {fill(previewCopy.remainder, { amount: formatAmount(preview.remainder, token) })}
        </p>
      ) : null}
      <p className="text-body text-sm">
        {shortLine(present, preview.levels, preview.weightsBps, preview.returned, token)}
      </p>
      <p className="text-lime-ink text-sm">
        {preview.returned > 0n
          ? fill(copy.addsUpReturned, {
              returned: formatAmount(preview.returned, token),
              reward: formatAmount(preview.reward, token),
            })
          : fill(copy.addsUp, { reward: formatAmount(preview.reward, token) })}
      </p>
      <dl className="bg-soft grid grid-cols-2 gap-3 rounded-xl px-3 py-2.5 text-sm">
        <div>
          <dt className="text-subtle">{copy.proceeds}</dt>
          <dd className="text-ink font-mono tabular-nums">{formatAmount(priceMinor, token)}</dd>
        </div>
        <div>
          <dt className="text-subtle">{copy.net}</dt>
          <dd className="text-ink font-mono tabular-nums">
            {formatAmount(priceMinor - preview.reserved, token)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
