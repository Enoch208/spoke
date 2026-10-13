import { Card } from "@/components/ui/card";
import { fill, required } from "@/lib/copy";
import { formatAmount, formatSplit, numberWord, type TokenLike } from "@/lib/format";
import { previewCopy } from "./copy-preview";
import { studioCopy } from "./copy";
import type { SplitPreview } from "./split";
import type { ShortPathMode } from "./terms";

const sentence = (
  preview: SplitPreview,
  mode: ShortPathMode,
  fullWeights: readonly number[],
  token: TokenLike,
) => {
  const present = Math.min(preview.pathLength, preview.levels);
  if (present >= preview.levels)
    return preview.levels === 1
      ? required.splitPreviewOne
      : fill(required.splitPreview, {
          split: formatSplit(fullWeights),
          levelsWord: numberWord(preview.levels),
        });
  if (mode === "RENORMALIZE_EXISTING")
    return present === 1
      ? required.shortPathOne
      : fill(required.shortPath, {
          countWord: numberWord(present),
          split: formatSplit(preview.weightsBps),
        });
  const amount = formatAmount(preview.returned, token);
  return present === 1
    ? fill(previewCopy.returnShortOne, { amount })
    : fill(previewCopy.returnShort, {
        countWord: numberWord(present),
        count: String(present),
        amount,
      });
};

const outsideLine = (preview: SplitPreview) => {
  if (preview.pathLength <= preview.levels) return null;
  const from = String(preview.levels + 1);
  return preview.pathLength === preview.levels + 1
    ? fill(previewCopy.outsideOne, { from })
    : fill(previewCopy.outside, { from, to: String(preview.pathLength) });
};

export function PreviewCard({
  preview,
  mode,
  fullWeights,
  token,
}: {
  preview: SplitPreview;
  mode: ShortPathMode;
  fullWeights: readonly number[];
  token: TokenLike;
}) {
  const outside = outsideLine(preview);
  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-ink text-sm font-medium">
          {preview.pathLength === 1
            ? previewCopy.cardOne
            : fill(previewCopy.cardMany, { count: String(preview.pathLength) })}
        </h3>
        <span className="text-subtle font-mono text-sm tabular-nums">
          {formatAmount(preview.reward, token)}
        </span>
      </div>
      <dl className="flex flex-col gap-1.5">
        {preview.amounts.map((amount, index) => (
          <div key={String(index)} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-body">
              {fill(studioCopy.weights.short, { level: String(index + 1) })}
            </dt>
            <dd className="text-ink font-mono tabular-nums">{formatAmount(amount, token)}</dd>
          </div>
        ))}
      </dl>
      {preview.returned > 0n || preview.remainder !== 0n || outside ? (
        <ul className="border-hairline text-subtle flex flex-col gap-1 border-t pt-2 text-sm">
          {preview.returned > 0n ? (
            <li>{fill(previewCopy.returned, { amount: formatAmount(preview.returned, token) })}</li>
          ) : null}
          {preview.remainder !== 0n ? (
            <li>
              {fill(previewCopy.remainder, { amount: formatAmount(preview.remainder, token) })}
            </li>
          ) : null}
          {outside ? <li>{outside}</li> : null}
        </ul>
      ) : null}
      <p className="text-body text-sm">{sentence(preview, mode, fullWeights, token)}</p>
    </Card>
  );
}
