import { fill, required } from "@/lib/copy";
import { formatAmount, formatBps, formatSplit, numberWord, type TokenLike } from "@/lib/format";
import { createLinkCopy } from "../copy/links";
import { rewardFor, splitFor, WeightsBar, type PolicyVersion } from "../shared/policy";

const levelName = (index: number) =>
  index === 0
    ? createLinkCopy.you
    : fill(index === 1 ? createLinkCopy.above : createLinkCopy.abovePlural, { n: String(index) });

export function CreateLinkSplit({
  version,
  price,
  token,
  merchant,
  pathLength,
}: {
  version: PolicyVersion;
  price: bigint;
  token: TokenLike;
  merchant: string;
  pathLength: number;
}) {
  const max = version.maxRewardedAncestors;
  const eligible = Math.min(pathLength, max);
  const full = splitFor(price, version, max);
  const actual = splitFor(price, version, eligible);
  const reward = rewardFor(price, version);
  const short = eligible < max;
  return (
    <section className="bg-soft grid min-w-0 grid-cols-1 gap-4 rounded-2xl p-4 wrap-anywhere">
      <div className="grid min-w-0 grid-cols-1 gap-1">
        <h3 className="text-ink font-medium">{createLinkCopy.splitTitle}</h3>
        <p className="text-body text-sm">
          {fill(createLinkCopy.rewardLine, {
            pct: formatBps(version.commissionBps),
            cap: formatAmount(BigInt(version.perSaleCap), token),
            merchant,
          })}
        </p>
      </div>
      <WeightsBar weights={version.weightsBps} className="min-w-0" />
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">{createLinkCopy.levelsTable}</caption>
        <tbody className="divide-hairline divide-y">
          {version.weightsBps.map((weight, index) => (
            <tr key={index}>
              <th scope="row" className="text-body w-[44%] py-2 pr-2 text-left font-normal">
                {levelName(index)}
              </th>
              <td className="text-subtle w-[20%] py-2 text-right tabular-nums">
                {formatBps(weight)}
              </td>
              <td className="text-ink w-[36%] py-2 pl-2 text-right font-mono tabular-nums">
                {formatAmount(full.amounts[index] ?? 0n, token)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-body text-sm">
        {fill(createLinkCopy.example, {
          price: formatAmount(price, token, { testnet: true }),
          reward: formatAmount(reward, token),
        })}{" "}
        {eligible === 1
          ? required.splitPreviewOne
          : fill(required.splitPreview, {
              split: formatSplit(actual.weightsBps),
              levelsWord: numberWord(eligible),
            })}
      </p>
      {short ? (
        <p className="bg-sky-soft text-sky-ink rounded-xl px-3 py-2 text-sm">
          {version.shortPathMode === "RENORMALIZE_EXISTING"
            ? eligible === 1
              ? required.shortPathOne
              : fill(required.shortPath, {
                  countWord: numberWord(eligible),
                  split: formatSplit(actual.weightsBps),
                })
            : fill(createLinkCopy.shortReturned, { k: numberWord(eligible), merchant })}
        </p>
      ) : null}
    </section>
  );
}
