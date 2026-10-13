"use client";

import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  Link01Icon,
  ShoppingBag01Icon,
  Store01Icon,
  UserIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { KeyboardEvent } from "react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { activityCopy, explorerCopy, graphCopy, markWords } from "./copy";
import type { GraphNode } from "./model";
import { personInitials, personLabel } from "./person";

export type Mark = { state: "PENDING" | "FINALIZED" | "REFUNDED"; count: number; saleId: string };
export type Activity = keyof typeof activityCopy;

const markStyle = {
  PENDING: { icon: Clock01Icon, fill: "fill-amber-soft", text: "text-amber-ink" },
  FINALIZED: { icon: CheckmarkBadge01Icon, fill: "fill-lime-soft", text: "text-lime-ink" },
  REFUNDED: { icon: ArrowTurnBackwardIcon, fill: "fill-pink-soft", text: "text-pink-ink" },
} as const;

const activityIcon: Record<Activity, IconSvgElement> = {
  shared: Link01Icon,
  viewed: ViewIcon,
  purchased: ShoppingBag01Icon,
};

const clip = (text: string, max = 18) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function Icon({
  icon,
  size,
  className,
}: {
  icon: IconSvgElement;
  size: number;
  className?: string;
}) {
  return (
    <g transform={`translate(${String(-size / 2)},${String(-size / 2)})`} className={className}>
      <HugeiconsIcon icon={icon} size={size} strokeWidth={2} aria-hidden="true" />
    </g>
  );
}

export function MerchantGlyph({ name, showLabel }: { name: string; showLabel: boolean }) {
  return (
    <g data-graph-item="merchant">
      <rect x={-18} y={-18} width={36} height={36} rx={10} className="fill-ink" />
      <Icon icon={Store01Icon} size={18} className="text-page" />
      {showLabel ? (
        <text y={34} textAnchor="middle" className="fill-ink text-[12px] font-medium">
          {clip(fill(graphCopy.merchant, { merchant: name }), 26)}
        </text>
      ) : null}
    </g>
  );
}

export function NodeGlyph({
  node,
  self,
  selected,
  focused,
  activity,
  marks,
  showLabel,
  level,
  onSelect,
  onSelectSale,
  onKeyDown,
}: {
  node: GraphNode;
  self: boolean;
  selected: boolean;
  focused: boolean;
  activity: Activity;
  marks: readonly Mark[];
  showLabel: boolean;
  level: number;
  onSelect: () => void;
  onSelectSale: (saleId: string) => void;
  onKeyDown: (event: KeyboardEvent<SVGGElement>) => void;
}) {
  const label = personLabel(node.owner, { self, hidden: node.moderationFlag && !self });
  const sales = node.counts.pending + node.counts.finalized + node.counts.refunded;
  const name = fill(explorerCopy.nodeName, {
    display: label,
    n: String(level),
    activity: activityCopy[activity],
    k: String(node.childCount),
    s: String(sales),
  });
  return (
    <g
      data-graph-item="node"
      role="treeitem"
      aria-label={name}
      aria-selected={selected}
      aria-level={level}
      tabIndex={focused ? 0 : -1}
      onKeyDown={onKeyDown}
      onClick={onSelect}
      className="cursor-pointer outline-none focus-visible:[&>.ring]:opacity-100"
    >
      <title>{name}</title>
      <circle r={26} className="ring fill-none stroke-sky-deep opacity-0" strokeWidth={2} />
      {self ? <circle r={21} className="fill-none stroke-ink" strokeWidth={2} /> : null}
      <circle
        r={16}
        className={cx(
          activity === "purchased" ? "fill-lime-soft" : "fill-surface",
          selected ? "stroke-ink" : self ? "stroke-ink" : "stroke-control-edge",
        )}
        strokeWidth={selected ? 2.5 : self ? 2 : 1.25}
      />
      {self ? (
        <Icon icon={UserIcon} size={14} className="text-ink" />
      ) : (
        <text
          y={4}
          textAnchor="middle"
          className="fill-ink pointer-events-none text-[10px] font-semibold"
        >
          {personInitials(node.owner, { self, hidden: node.moderationFlag && !self })}
        </text>
      )}
      <g transform="translate(12,12)">
        <circle r={7} className="fill-surface stroke-line" strokeWidth={1} />
        <Icon icon={activityIcon[activity]} size={9} className="text-ink" />
      </g>
      {showLabel ? (
        <text y={32} textAnchor="middle" className="fill-ink pointer-events-none text-[12px]">
          {clip(label)}
        </text>
      ) : null}
      {marks.map((mark, index) => (
        <g
          key={mark.state}
          data-graph-item="sale"
          transform={`translate(${String(24 + index * 34)},-9)`}
          className={cx("cursor-pointer", markStyle[mark.state].text)}
          onClick={(event) => {
            event.stopPropagation();
            onSelectSale(mark.saleId);
          }}
        >
          <title>{`${String(mark.count)} ${markWords[mark.state]}`}</title>
          <rect width={31} height={18} rx={9} className={markStyle[mark.state].fill} />
          <g transform="translate(9,9)">
            <Icon icon={markStyle[mark.state].icon} size={11} />
          </g>
          <text
            x={22}
            y={13}
            textAnchor="middle"
            className="fill-current text-[10px] font-semibold"
          >
            {mark.count > 99 ? "99+" : String(mark.count)}
          </text>
        </g>
      ))}
    </g>
  );
}

export function MoreGlyph({
  count,
  other,
  loading,
  onClick,
}: {
  count: number;
  other: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const text = other
    ? fill(explorerCopy.moreOther, { n: String(count) })
    : fill(explorerCopy.more, { n: String(count) });
  const width = Math.max(36, text.length * 7 + 16);
  return (
    <g
      data-graph-item="more"
      role="button"
      tabIndex={0}
      aria-label={fill(explorerCopy.expand, { n: String(count) })}
      className={cx("cursor-pointer", loading && "opacity-50")}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
    >
      <rect
        x={-12}
        y={-12}
        width={width}
        height={24}
        rx={12}
        className="fill-pill stroke-line"
        strokeWidth={1}
      />
      <text
        x={width / 2 - 12}
        y={4}
        textAnchor="middle"
        className="fill-ink text-[11px] font-medium"
      >
        {text}
      </text>
    </g>
  );
}
