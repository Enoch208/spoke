import type { SpokeClient } from "@/lib/client/types";
import { isClientError } from "@/lib/client/errors";
import { mergeGraph } from "./model";

const missingAfterReplay = (error: unknown): undefined => {
  if (isClientError(error) && error.code === "NOT_FOUND") return undefined;
  throw error;
};

export async function fetchGraphSnapshot(
  client: Pick<SpokeClient, "call">,
  options: {
    campaignId: string;
    depth: number;
    rootNode: string | null;
    branches: readonly string[];
    paths: readonly string[];
    chainId: number;
  },
) {
  const { campaignId, depth, rootNode, branches, paths, chainId } = options;
  const [base, expanded, ancestry] = await Promise.all([
    client.call("graph.forCampaign", {
      campaignId,
      depth,
      childLimit: 20,
      ...(rootNode ? { rootNode } : {}),
    }),
    Promise.all(
      branches.map((rootNode) =>
        client
          .call("graph.forCampaign", { campaignId, rootNode, depth: 3, childLimit: 100 })
          .catch(missingAfterReplay),
      ),
    ),
    Promise.all(
      [...new Set([...(rootNode ? [rootNode] : []), ...paths])].map((nodeId) =>
        client.call("graph.ancestry", { nodeId, chainId }).catch(missingAfterReplay),
      ),
    ),
  ]);
  return mergeGraph(
    [...expanded, base],
    ancestry.flatMap((path) => path?.nodes ?? []).filter((node) => node.campaignId === campaignId),
  );
}
