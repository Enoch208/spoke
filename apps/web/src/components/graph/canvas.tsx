"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { fill } from "@/lib/copy";
import { explorerCopy } from "./copy";
import { BuyerMark, Edges, PathTags, type Highlight } from "./canvas-edges";
import { MerchantGlyph, MoreGlyph, NodeGlyph, type Activity, type Mark } from "./canvas-node";
import type { GraphNode, Placed } from "./model";
import type { usePanZoom } from "./use-pan-zoom";

type PanZoom = ReturnType<typeof usePanZoom>;

const margin = 160;

const neighbour = (current: Placed, key: string): Placed | null => {
  if (key === "ArrowLeft") return current.parent?.data.kind === "node" ? current.parent : null;
  if (key === "ArrowRight")
    return current.children?.find((child) => child.data.kind === "node") ?? null;
  const siblings = (current.parent?.children ?? []).filter((child) => child.data.kind === "node");
  const index = siblings.indexOf(current);
  const next =
    key === "ArrowDown" ? siblings[index + 1] : key === "ArrowUp" ? siblings[index - 1] : undefined;
  return next ?? null;
};

export function GraphCanvas({
  placed,
  merchant,
  campaignName,
  panZoom,
  height,
  highlight,
  selectedNode,
  loadingId,
  isSelf,
  activityOf,
  marksOf,
  onSelectNode,
  onSelectSale,
  onMore,
  onToggle,
  onClear,
}: {
  placed: readonly Placed[];
  merchant: string;
  campaignName: string;
  panZoom: PanZoom;
  height: number;
  highlight: Highlight | null;
  selectedNode: string | null;
  loadingId: string | null;
  isSelf: (node: GraphNode) => boolean;
  activityOf: (node: GraphNode) => Activity;
  marksOf: (nodeId: string) => readonly Mark[];
  onSelectNode: (nodeId: string) => void;
  onSelectSale: (saleId: string) => void;
  onMore: (parentId: string) => void;
  onToggle: (nodeId: string) => void;
  onClear: () => void;
}) {
  const { svg, view, handlers } = panZoom;
  const [width, setWidth] = useState(900);
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [svg]);
  const left = -view.x / view.k - margin;
  const right = (width - view.x) / view.k + margin;
  const top = -view.y / view.k - margin;
  const bottom = (height - view.y) / view.k + margin;
  const visible = placed.filter(
    (node) => node.y >= left && node.y <= right && node.x >= top && node.x <= bottom,
  );
  const firstNode = placed.find((node) => node.data.kind === "node");
  const focused = focusId ?? selectedNode ?? firstNode?.data.id ?? null;
  const labels = view.k >= 0.6;
  const purchase = highlight
    ? placed.find((node) => node.data.id === highlight.purchaseNodeId)
    : undefined;

  const onKeyDown = (current: Placed) => (event: KeyboardEvent<SVGGElement>) => {
    const node = current.data.kind === "node" ? current.data : null;
    if (!node) return;
    if (event.key === "Enter") onSelectNode(node.id);
    else if (event.key === " ") {
      event.preventDefault();
      onToggle(node.id);
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const next = neighbour(current, event.key);
      if (event.key === "ArrowRight" && node.collapsed) onToggle(node.id);
      else if (next) {
        setFocusId(next.data.id);
        const element = svg.current?.querySelector<SVGGElement>(
          `[data-node-id="${next.data.id}"] [role="treeitem"]`,
        );
        element?.focus();
      }
    }
  };

  return (
    <svg
      ref={svg}
      role="group"
      aria-label={fill(explorerCopy.canvas, { campaign: campaignName })}
      className="bg-soft block w-full touch-none select-none"
      style={{ height }}
      {...handlers}
      onClick={(event) => {
        if (!(event.target instanceof Element) || !event.target.closest("[data-graph-item]"))
          onClear();
      }}
    >
      <g
        style={{
          transform: `translate(${String(view.x)}px, ${String(view.y)}px) scale(${String(view.k)})`,
        }}
      >
        <Edges placed={visible} highlight={highlight} />
        {highlight && purchase ? <BuyerMark from={purchase} /> : null}
        <g role="tree" aria-label={campaignName}>
          {visible.map((node) => {
            const datum = node.data;
            const dim =
              highlight !== null && !highlight.path.has(datum.id) && datum.kind !== "merchant";
            return (
              <g
                key={datum.id}
                data-node-id={datum.id}
                transform={`translate(${String(node.y)},${String(node.x)})`}
                className="ease-spring transition-opacity duration-[423ms]"
                opacity={dim ? 0.3 : 1}
              >
                {datum.kind === "merchant" ? (
                  <MerchantGlyph name={merchant} showLabel={labels} />
                ) : null}
                {datum.kind === "more" ? (
                  <MoreGlyph
                    count={datum.count}
                    other={false}
                    loading={loadingId === datum.parentId}
                    onClick={() => {
                      onMore(datum.parentId);
                    }}
                  />
                ) : null}
                {datum.kind === "node" ? (
                  <NodeGlyph
                    node={datum.node}
                    self={isSelf(datum.node)}
                    selected={selectedNode === datum.id}
                    focused={focused === datum.id}
                    activity={activityOf(datum.node)}
                    marks={marksOf(datum.id)}
                    showLabel={labels}
                    level={datum.node.depth}
                    onSelect={() => {
                      setFocusId(datum.id);
                      onSelectNode(datum.id);
                    }}
                    onSelectSale={onSelectSale}
                    onKeyDown={onKeyDown(node)}
                  />
                ) : null}
              </g>
            );
          })}
        </g>
        {highlight ? <PathTags placed={visible} highlight={highlight} /> : null}
      </g>
    </svg>
  );
}
