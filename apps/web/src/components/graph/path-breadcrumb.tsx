"use client";

import { ArrowRight01Icon, Store01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { graphCopy } from "./copy";
import { personLabel, type Actor } from "./person";

export type CrumbNode = { nodeId: string; owner: Actor; hidden: boolean; self: boolean };

const limit = 6;

function Chip({
  label,
  self,
  merchant = false,
}: {
  label: string;
  self: boolean;
  merchant?: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-8 max-w-[180px] items-center gap-1.5 rounded-full px-3 text-sm",
        merchant
          ? "bg-ink text-page"
          : self
            ? "bg-lime-soft text-ink ring-ink ring-2"
            : "bg-pill text-ink",
      )}
    >
      {merchant || self ? (
        <HugeiconsIcon
          icon={merchant ? Store01Icon : UserIcon}
          size={14}
          strokeWidth={2}
          aria-hidden="true"
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function Arrow() {
  return (
    <HugeiconsIcon
      icon={ArrowRight01Icon}
      size={14}
      strokeWidth={2}
      aria-hidden="true"
      className="text-faint shrink-0"
    />
  );
}

export function PathBreadcrumb({
  merchant,
  nodes,
  onSelect,
  label,
}: {
  merchant: string;
  nodes: readonly CrumbNode[];
  onSelect?: (nodeId: string) => void;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapse = !expanded && nodes.length > limit;
  const head = collapse ? nodes.slice(0, 2) : nodes;
  const tail = collapse ? nodes.slice(-3) : [];
  const hiddenCount = nodes.length - head.length - tail.length;
  const item = (node: CrumbNode) => {
    const text = personLabel(node.owner, { self: node.self, hidden: node.hidden });
    return (
      <li key={node.nodeId} className="flex items-center gap-1.5">
        <Arrow />
        {onSelect ? (
          <button
            type="button"
            className="cursor-pointer rounded-full"
            onClick={() => {
              onSelect(node.nodeId);
            }}
          >
            <Chip label={text} self={node.self} />
          </button>
        ) : (
          <Chip label={text} self={node.self} />
        )}
      </li>
    );
  };
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <li>
        <Chip label={fill(graphCopy.merchant, { merchant })} self={false} merchant />
      </li>
      {head.map(item)}
      {collapse ? (
        <li className="flex items-center gap-1.5">
          <Arrow />
          <button
            type="button"
            className="bg-soft text-body hover:bg-pill ease-spring h-8 cursor-pointer rounded-full px-3 text-sm transition-colors duration-[423ms]"
            onClick={() => {
              setExpanded(true);
            }}
          >
            {fill(graphCopy.collapsed, { n: String(hiddenCount) })}
          </button>
        </li>
      ) : null}
      {tail.map(item)}
    </ol>
  );
}
