"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useClientContext } from "@/lib/client/provider";
import { activeChain } from "@/lib/wagmi";
import { mergeGraph } from "./model";
import { fetchGraphSnapshot } from "./snapshot";

export type Scope = "me" | "campaign";
const emptyGraph = mergeGraph([]);

export function useGraphData({
  campaignId,
  scope,
  myNodeId,
  depth,
}: {
  campaignId: string | null;
  scope: Scope;
  myNodeId: string | null;
  depth: number;
}) {
  const { client, mode } = useClientContext();
  const context = `${mode}:${campaignId ?? ""}:${scope}:${myNodeId ?? ""}:${String(depth)}`;
  const [requested, setRequested] = useState({
    context,
    branches: [] as string[],
    paths: [] as string[],
  });
  const [loading, setLoading] = useState<string | null>(null);
  const branches = requested.context === context ? requested.branches : [];
  const paths = requested.context === context ? requested.paths : [];
  const around = scope === "me" && myNodeId !== null;
  const snapshot = useQuery({
    queryKey: [mode, "graph", "snapshot", { context, branches, paths }],
    enabled: client !== null && campaignId !== null,
    staleTime: 5_000,
    refetchInterval: 20_000,
    queryFn: async () => {
      if (!client || !campaignId) throw new Error("Network is not ready");
      return fetchGraphSnapshot(client, {
        campaignId,
        depth: Math.min(16, depth + (around ? 1 : 0)),
        rootNode: around ? myNodeId : null,
        branches,
        paths,
        chainId: activeChain.id,
      });
    },
  });
  const load = async (nodeId: string, kind: "branches" | "paths"): Promise<boolean> => {
    if (!client || !campaignId || (kind === "branches" ? branches : paths).length >= 16)
      return false;
    setLoading(nodeId);
    try {
      if (kind === "branches")
        await client.call("graph.forCampaign", {
          campaignId,
          rootNode: nodeId,
          depth: 3,
          childLimit: 100,
        });
      else {
        const path = await client.call("graph.ancestry", { nodeId, chainId: activeChain.id });
        if (!path.nodes.length || path.nodes.some((node) => node.campaignId !== campaignId))
          return false;
      }
      setRequested((previous) => {
        const current =
          previous.context === context ? previous : { context, branches: [], paths: [] };
        return { ...current, [kind]: [...new Set([...current[kind], nodeId])] };
      });
      return true;
    } catch {
      return false;
    } finally {
      setLoading(null);
    }
  };
  return {
    graph: snapshot.data ?? emptyGraph,
    pending: snapshot.isPending,
    error: snapshot.error,
    retry: () => {
      void snapshot.refetch();
    },
    expand: (nodeId: string) => load(nodeId, "branches"),
    reveal: (nodeId: string) => load(nodeId, "paths"),
    loading,
  };
}
