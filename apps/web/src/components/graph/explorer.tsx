"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "@/components/ui/cx";
import { usePhone } from "@/components/ui/use-phone";
import { useUiStore } from "@/lib/stores/ui";
import { GraphCanvas } from "./canvas";
import type { Activity, Mark } from "./canvas-node";
import { explorerCopy as copy } from "./copy";
import { ExplorerControls } from "./explorer-controls";
import { ExplorerFooter } from "./explorer-footer";
import { ExplorerPanel } from "./explorer-panel";
import { GraphTable } from "./graph-table";
import { fitTree, layout, type GraphNode } from "./model";
import { PathView } from "./path-view";
import { SalesList } from "./sales-list";
import { SearchBox } from "./search-box";
import { boundsOf } from "./bounds";
import { useExplorerState, depthValue } from "./use-explorer-state";
import { useGraphData, type Scope } from "./use-graph-data";
import { useHighlight } from "./use-highlight";
import { usePanZoom } from "./use-pan-zoom";

export type ExplorerProps = {
  earn: boolean;
  campaignId: string | null;
  campaignName: string;
  merchant: string;
  myNodeId: string | null;
  myLevel: number;
  selfNodes: ReadonlySet<string>;
  visited: ReadonlySet<string>;
  campaignSelect: ReactNode;
  summary: ReactNode;
  canJoin?: boolean;
};

export function Explorer(props: ExplorerProps) {
  const phone = usePhone();
  const pushToast = useUiStore((state) => state.pushToast);
  const state = useExplorerState({
    phone,
    defaultScope: props.earn && props.myNodeId ? "me" : "campaign",
  });
  const scope: Scope = props.myNodeId ? state.scope : "campaign";
  const depth = depthValue(state.depth);
  const data = useGraphData({
    campaignId: props.campaignId,
    scope,
    myNodeId: props.myNodeId,
    depth,
  });
  const panZoom = usePanZoom();
  const highlight = useHighlight(state.sale);
  const maxDepth = scope === "me" ? props.myLevel + depth : depth;
  const tree = useMemo(
    () => fitTree(data.graph, state.collapsed, maxDepth),
    [data.graph, state.collapsed, maxDepth],
  );
  const placed = useMemo(() => layout(tree.root), [tree.root]);
  const searchRef = useRef<HTMLDivElement>(null);
  const fitted = useRef<string | null>(null);
  const isSelf = (node: GraphNode) => props.selfNodes.has(node.nodeId);
  const activityOf = (node: GraphNode): Activity =>
    node.counts.pending + node.counts.finalized + node.counts.refunded > 0
      ? "purchased"
      : props.visited.has(node.nodeId)
        ? "viewed"
        : "shared";
  const marks = useMemo(() => {
    const map = new Map<string, Mark[]>();
    for (const marker of data.graph.markers) {
      const list = map.get(marker.nodeId) ?? [];
      const existing = list.find((mark) => mark.state === marker.state);
      if (existing) existing.count += 1;
      else list.push({ state: marker.state, count: 1, saleId: marker.saleId });
      map.set(marker.nodeId, list);
    }
    return map;
  }, [data.graph.markers]);

  const key = `${props.campaignId ?? ""}:${scope}:${String(placed.length > 1)}`;
  const initialFit = useEffectEvent(() => {
    const anchor = placed.find((node) => node.data.id === (props.myNodeId ?? "")) ?? placed[0];
    panZoom.fit(boundsOf(placed), 48, anchor ? { x: anchor.y, y: anchor.x } : undefined, 0.6);
  });
  useEffect(() => {
    if (fitted.current === key || !key.endsWith("true")) return;
    fitted.current = key;
    initialFit();
  }, [key]);

  const focusPath = useEffectEvent(() => {
    if (!highlight) return;
    const missing = [...highlight.path.keys()].some((nodeId) => !data.graph.nodes.has(nodeId));
    if (missing) void data.reveal(highlight.purchaseNodeId);
    const onPath = placed.filter((node) => highlight.path.has(node.data.id));
    if (onPath.length > 0) panZoom.fit(boundsOf(onPath), 120);
  });
  const highlighted = highlight ? `${highlight.saleId}:${String(highlight.path.size)}` : null;
  useEffect(() => {
    if (highlighted) focusPath();
  }, [highlighted]);

  const notFound = () => {
    pushToast({ id: "T-06", tone: "error", message: copy.notFound, durationMs: 5000 });
  };
  const selectSale = (saleId: string) => {
    if (phone) useUiStore.getState().open("M-16", { saleId });
    state.set({ sale: saleId, node: null });
  };
  const selectNode = (nodeId: string) => {
    state.set({ node: nodeId, sale: null });
  };
  const clear = () => {
    state.set({ node: null, sale: null });
  };
  const more = (parentId: string) => {
    if (state.collapsed.has(parentId)) {
      state.open(parentId);
      return;
    }
    void data.expand(parentId).then((ok) => {
      if (!ok) notFound();
    });
  };
  const findNode = (nodeId: string) => {
    if (data.graph.nodes.has(nodeId)) {
      selectNode(nodeId);
      return;
    }
    void data.reveal(nodeId).then((ok) => {
      if (ok) selectNode(nodeId);
      else notFound();
    });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === "Escape") clear();
    else if (event.key === "/") {
      event.preventDefault();
      searchRef.current?.querySelector("input")?.focus();
    } else if (event.key === "+" || event.key === "=") panZoom.zoomBy(1.2);
    else if (event.key === "-") panZoom.zoomBy(1 / 1.2);
    else if (event.key === "0") panZoom.fit(boundsOf(placed));
  };

  const canvasHeight = state.fullScreen
    ? typeof window === "undefined"
      ? 720
      : window.innerHeight - 140
    : 560;
  const search =
    props.campaignId !== null ? (
      <div ref={searchRef} className="contents">
        <SearchBox
          graph={data.graph}
          campaignId={props.campaignId}
          isSelf={(nodeId) => props.selfNodes.has(nodeId)}
          onNode={findNode}
          onSale={selectSale}
        />
      </div>
    ) : null;

  return (
    <div className="grid gap-4" onKeyDown={onKeyDown}>
      <ExplorerControls
        campaignSelect={props.campaignSelect}
        scope={props.earn && props.myNodeId ? scope : null}
        onScope={(next) => {
          state.reset();
          state.set({ scope: next });
        }}
        view={state.view}
        onView={(next) => {
          state.set({ view: next });
        }}
        depth={state.depth}
        onDepth={(next) => {
          state.set({ depth: next });
        }}
        allDisabled={data.graph.nodes.size > 500}
        search={search}
        onZoomIn={() => {
          panZoom.zoomBy(1.2);
        }}
        onZoomOut={() => {
          panZoom.zoomBy(1 / 1.2);
        }}
        onFit={() => {
          panZoom.fit(boundsOf(placed));
        }}
        fullScreen={state.fullScreen}
        onFullScreen={() => {
          state.setFullScreen(!state.fullScreen);
        }}
      />
      {props.summary}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className={cx(
            "bg-surface border-hairline min-w-0 overflow-hidden rounded-2xl border",
            state.fullScreen && "fixed inset-4 z-50 overflow-auto",
          )}
        >
          {state.view === "graph" ? (
            <>
              <a
                href="#graph-table"
                className="sr-only focus:not-sr-only focus:m-3 focus:inline-block"
              >
                {copy.skip}
              </a>
              <GraphCanvas
                placed={placed}
                merchant={props.merchant}
                campaignName={props.campaignName}
                panZoom={panZoom}
                height={canvasHeight}
                highlight={highlight}
                selectedNode={state.node}
                loadingId={data.loading}
                isSelf={isSelf}
                activityOf={activityOf}
                marksOf={(nodeId) => marks.get(nodeId) ?? []}
                onSelectNode={selectNode}
                onSelectSale={selectSale}
                onMore={more}
                onToggle={state.toggle}
                onClear={clear}
              />
            </>
          ) : null}
          {state.view === "table" ? (
            <div id="graph-table" className="p-4">
              <GraphTable
                graph={data.graph}
                placed={placed}
                isSelf={isSelf}
                activityOf={activityOf}
                selectedSale={state.sale}
                onToggle={state.toggle}
                onSelectNode={selectNode}
                onSelectSale={selectSale}
              />
            </div>
          ) : null}
          {state.view === "path" ? (
            <div className="grid gap-6 p-4">
              <PathView
                graph={data.graph}
                merchant={props.merchant}
                focus={state.node ?? props.myNodeId}
                isSelf={(nodeId) => props.selfNodes.has(nodeId)}
                onFocus={(nodeId) => {
                  state.set({ node: nodeId });
                }}
                onExpand={(nodeId) => void data.expand(nodeId)}
              />
              {props.campaignId ? (
                <SalesList
                  graph={data.graph}
                  campaignId={props.campaignId}
                  earn={props.earn}
                  isSelf={(nodeId) => props.selfNodes.has(nodeId)}
                  onSelectSale={selectSale}
                />
              ) : null}
            </div>
          ) : null}
          <ExplorerFooter
            graph={data.graph}
            highlight={highlight}
            trimmed={tree.trimmed}
            onClear={clear}
            showLegend={state.view !== "path"}
          />
        </div>
        <ExplorerPanel
          graph={data.graph}
          campaignId={props.campaignId}
          merchant={props.merchant}
          earn={props.earn}
          node={state.node}
          sale={state.sale}
          hidden={phone || state.view === "path"}
          selfNodes={props.selfNodes}
          canJoin={props.canJoin ?? false}
          onSelectNode={selectNode}
          onSelectSale={selectSale}
        />
      </div>
    </div>
  );
}
