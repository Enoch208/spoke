"use client";

import { useMemo, useState } from "react";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { activeChain } from "@/lib/wagmi";
import { mergeGraph, type GraphNode, type Slice } from "./model";

export type Scope = "me" | "campaign";

const childLimit = 20;
const unavailable = () => null;

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
  const { client } = useClientContext();
  const [extraSlices, setExtraSlices] = useState<readonly Slice[]>([]);
  const [extraNodes, setExtraNodes] = useState<readonly GraphNode[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const around = scope === "me" && myNodeId !== null;
  const fetchDepth = Math.min(16, depth + 1);
  const whole = useClientQuery(
    "graph.forCampaign",
    { campaignId: campaignId ?? "0", depth: Math.min(16, depth), childLimit },
    { enabled: campaignId !== null && !around, refetchInterval: 20_000 },
  );
  const down = useClientQuery(
    "graph.forCampaign",
    { campaignId: campaignId ?? "0", rootNode: myNodeId ?? "0", depth: fetchDepth, childLimit },
    { enabled: campaignId !== null && around, refetchInterval: 20_000 },
  );
  const ancestry = useClientQuery(
    "graph.ancestry",
    { nodeId: myNodeId ?? "0", chainId: activeChain.id },
    { enabled: around },
  );
  const base = around ? down : whole;
  const graph = useMemo(
    () =>
      mergeGraph(
        [base.data, ...extraSlices],
        [...(around ? (ancestry.data?.nodes ?? []) : []), ...extraNodes],
      ),
    [base.data, extraSlices, ancestry.data, extraNodes, around],
  );

  const expand = async (nodeId: string): Promise<boolean> => {
    if (!client || !campaignId) return false;
    setLoading(nodeId);
    const slice = await client
      .call("graph.forCampaign", { campaignId, rootNode: nodeId, depth: 3, childLimit: 100 })
      .catch(unavailable);
    setLoading(null);
    if (!slice) return false;
    setExtraSlices((previous) => [...previous, slice]);
    return true;
  };

  const reveal = async (nodeId: string): Promise<boolean> => {
    if (!client) return false;
    const path = await client
      .call("graph.ancestry", { nodeId, chainId: activeChain.id })
      .catch(unavailable);
    if (!path || path.nodes.length === 0) return false;
    setExtraNodes((previous) => [...previous, ...path.nodes]);
    return true;
  };

  return {
    graph,
    pending: base.isPending || (around && ancestry.isPending),
    error: base.error ?? (around ? ancestry.error : null),
    retry: () => {
      void base.refetch();
      if (around) void ancestry.refetch();
    },
    expand,
    reveal,
    loading,
  };
}
