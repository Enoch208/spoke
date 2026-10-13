import { DiamondIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { formatBps } from "@/lib/format";
import { graphCopy } from "./copy";
import type { Placed } from "./model";

export type Highlight = {
  saleId: string;
  purchaseNodeId: string;
  refunded: boolean;
  path: ReadonlyMap<string, { level: number; weightBps: number; paid: boolean }>;
};

const curve = (sx: number, sy: number, tx: number, ty: number) => {
  const mid = (sx + tx) / 2;
  return `M${String(sx)},${String(sy)} C${String(mid)},${String(sy)} ${String(mid)},${String(ty)} ${String(tx)},${String(ty)}`;
};

export function Edges({
  placed,
  highlight,
}: {
  placed: readonly Placed[];
  highlight: Highlight | null;
}) {
  return (
    <g aria-hidden="true">
      {placed.map((node) => {
        const parent = node.parent;
        if (!parent) return null;
        const onPath =
          highlight !== null &&
          highlight.path.has(node.data.id) &&
          (parent.data.kind === "merchant" || highlight.path.has(parent.data.id));
        const more = node.data.kind === "more";
        return (
          <path
            key={`edge-${node.data.id}`}
            d={curve(parent.y + 18, parent.x, node.y - (more ? 12 : 18), node.x)}
            fill="none"
            strokeWidth={onPath ? 2.5 : 1.25}
            strokeDasharray={
              onPath
                ? highlight.refunded
                  ? "4 4"
                  : undefined
                : highlight || more
                  ? "3 4"
                  : undefined
            }
            className={cx(
              "ease-spring transition-[opacity] duration-[423ms]",
              onPath ? (highlight.refunded ? "stroke-pink-deep" : "stroke-olive") : "stroke-line",
              highlight && !onPath && "opacity-30",
            )}
          />
        );
      })}
    </g>
  );
}

export function PathTags({
  placed,
  highlight,
}: {
  placed: readonly Placed[];
  highlight: Highlight;
}) {
  return (
    <g aria-hidden="true">
      {placed.map((node) => {
        const entry = highlight.path.get(node.data.id);
        if (!entry || !entry.paid) return null;
        const text = `${fill(graphCopy.levelShort, { n: String(entry.level) })} · ${formatBps(entry.weightBps)}`;
        const width = text.length * 6.4 + 14;
        return (
          <g
            key={`tag-${node.data.id}`}
            transform={`translate(${String(node.y - width / 2)},${String(node.x - 44)})`}
          >
            <rect
              width={width}
              height={18}
              rx={9}
              className={highlight.refunded ? "fill-pink-soft" : "fill-olive"}
            />
            <text
              x={width / 2}
              y={13}
              textAnchor="middle"
              className={cx(
                "text-[10px] font-semibold",
                highlight.refunded ? "fill-pink-ink" : "fill-lime",
              )}
            >
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function BuyerMark({ from }: { from: Placed }) {
  const x = from.y + 120;
  const y = from.x + 34;
  return (
    <g aria-hidden="true">
      <path
        d={curve(from.y + 18, from.x, x - 12, y)}
        fill="none"
        strokeDasharray="4 4"
        strokeWidth={1.5}
        className="stroke-ink"
      />
      <g transform={`translate(${String(x)},${String(y)}) rotate(45)`}>
        <rect
          x={-9}
          y={-9}
          width={18}
          height={18}
          rx={3}
          className="fill-surface stroke-ink"
          strokeWidth={1.5}
        />
      </g>
      <g transform={`translate(${String(x - 6)},${String(y - 6)})`} className="text-ink">
        <HugeiconsIcon icon={DiamondIcon} size={12} strokeWidth={2} />
      </g>
      <text x={x} y={y + 26} textAnchor="middle" className="fill-ink text-[12px] font-medium">
        {graphCopy.buyer}
      </text>
    </g>
  );
}
