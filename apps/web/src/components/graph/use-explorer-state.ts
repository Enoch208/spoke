"use client";

import { useState } from "react";
import { oneOf, useQueryState } from "@/components/earn/shared/query";
import type { Scope } from "./use-graph-data";

export const depthOptions = ["2", "4", "6", "all"] as const;
export type DepthOption = (typeof depthOptions)[number];
export const viewOptions = ["graph", "table", "path"] as const;
export type ViewOption = (typeof viewOptions)[number];

export const depthValue = (depth: DepthOption) => (depth === "all" ? 16 : Number(depth));

export function useExplorerState({ phone, defaultScope }: { phone: boolean; defaultScope: Scope }) {
  const query = useQueryState();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [fullScreen, setFullScreen] = useState(false);
  const scope = oneOf(query.get("scope"), ["me", "campaign"] as const, defaultScope);
  const view = oneOf(query.get("view"), viewOptions, phone ? "path" : "graph");
  const depth = oneOf(query.get("depth"), depthOptions, "4");
  return {
    campaign: query.get("campaign"),
    node: query.get("node"),
    sale: query.get("sale"),
    scope,
    view,
    depth,
    collapsed,
    fullScreen,
    setFullScreen,
    set: query.set,
    toggle: (nodeId: string) => {
      setCollapsed((previous) => {
        const next = new Set(previous);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    },
    open: (nodeId: string) => {
      setCollapsed((previous) => {
        if (!previous.has(nodeId)) return previous;
        const next = new Set(previous);
        next.delete(nodeId);
        return next;
      });
    },
    reset: () => {
      setCollapsed(new Set());
    },
  };
}
