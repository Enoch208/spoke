"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { explorerCopy as copy, graphCopy } from "./copy";
import type { Graph } from "./model";
import { pathTo } from "./model";
import { PathBreadcrumb } from "./path-breadcrumb";
import { personLabel } from "./person";

export function PathView({
  graph,
  merchant,
  focus,
  isSelf,
  onFocus,
  onExpand,
}: {
  graph: Graph;
  merchant: string;
  focus: string | null;
  isSelf: (nodeId: string) => boolean;
  onFocus: (nodeId: string | null) => void;
  onExpand: (nodeId: string) => void;
}) {
  const current = focus ? graph.nodes.get(focus) : undefined;
  const path = focus ? pathTo(graph, focus) : [];
  const children = [...graph.nodes.values()]
    .filter((node) =>
      current
        ? node.parentNodeId === current.nodeId
        : node.parentNodeId === "0" || !graph.nodes.has(node.parentNodeId),
    )
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true }));
  const label = (nodeId: string) => {
    const node = graph.nodes.get(nodeId);
    return node
      ? personLabel(node.owner, {
          self: isSelf(nodeId),
          hidden: node.moderationFlag && !isSelf(nodeId),
        })
      : "";
  };
  const missing = current ? current.childCount - children.length : 0;
  return (
    <div className="grid gap-4">
      <PathBreadcrumb
        merchant={merchant}
        label={graphCopy.pathLabel}
        onSelect={(nodeId) => {
          onFocus(nodeId);
        }}
        nodes={path.map((nodeId) => {
          const node = graph.nodes.get(nodeId);
          return {
            nodeId,
            owner: node?.owner ?? {
              address: null,
              handle: null,
              displayName: null,
              visibility: "private",
            },
            self: isSelf(nodeId),
            hidden: Boolean(node?.moderationFlag) && !isSelf(nodeId),
          };
        })}
      />
      {current ? (
        <Button
          size="sm"
          variant="secondary"
          icon={ArrowLeft01Icon}
          className="justify-self-start"
          onClick={() => {
            onFocus(current.parentNodeId === "0" ? null : current.parentNodeId);
          }}
        >
          {copy.upOne}
        </Button>
      ) : null}
      <section className="grid gap-2">
        <h3 className="text-ink text-sm font-medium">
          {current
            ? isSelf(current.nodeId)
              ? copy.underYou
              : fill(copy.underNode, { person: label(current.nodeId) })
            : fill(graphCopy.merchant, { merchant })}
        </h3>
        {children.length === 0 && missing <= 0 ? (
          <p className="text-subtle text-sm">{copy.noChildren}</p>
        ) : null}
        <ul className="grid gap-2">
          {children.map((node) => (
            <li key={node.nodeId}>
              <button
                type="button"
                onClick={() => {
                  onFocus(node.nodeId);
                  if (node.childCount > 0) onExpand(node.nodeId);
                }}
                className="border-hairline bg-surface hover:bg-soft ease-spring flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors duration-[423ms]"
              >
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="text-ink truncate font-medium">{label(node.nodeId)}</span>
                  <span className="text-subtle text-sm">
                    {fill(graphCopy.childLine, {
                      under: formatCount(node.childCount),
                      settled: formatCount(node.counts.finalized),
                      pending: formatCount(node.counts.pending),
                    })}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="text-subtle"
                />
              </button>
            </li>
          ))}
        </ul>
        {missing > 0 && current ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onExpand(current.nodeId);
            }}
          >
            {fill(copy.expand, { n: String(missing) })}
          </Button>
        ) : null}
      </section>
    </div>
  );
}
