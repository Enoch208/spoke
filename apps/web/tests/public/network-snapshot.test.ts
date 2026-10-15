import { describe, expect, it, vi } from "vitest";
import { graphSlice, graphNode } from "@spoke/protocol";
import { fetchGraphSnapshot } from "../../src/components/graph/snapshot";
import { ClientError } from "../../src/lib/client/errors";
import type { SpokeClient } from "../../src/lib/client/types";

const node = graphNode.parse({
  nodeId: "2",
  campaignId: "1",
  parentNodeId: "0",
  owner: { address: null, handle: null, displayName: null, visibility: "private" },
  depth: 1,
  childCount: 0,
  hiddenChildCount: 0,
  counts: { pending: 1, finalized: 0, refunded: 0 },
  moderationFlag: false,
  activity: [],
});
const empty = graphSlice.parse({
  nodes: [],
  edges: [],
  saleMarkers: [],
  indexedBlock: "10",
  truncated: false,
});
const options = {
  campaignId: "1",
  depth: 1,
  rootNode: null,
  branches: ["2"],
  paths: [],
  chainId: 10143,
};
describe("expanded live network snapshots", () => {
  it("refreshes expanded sale outcomes and removes a branch after replay", async () => {
    let state: "PENDING" | "FINALIZED" | "removed" = "PENDING";
    const call = vi.fn((_method: string, input: { rootNode?: string }) => {
      if (!input.rootNode) return Promise.resolve(empty);
      if (state === "removed")
        return Promise.reject(new ClientError({ code: "NOT_FOUND", message: "Removed by replay" }));
      return Promise.resolve({
        ...empty,
        nodes: [node],
        saleMarkers: [{ saleId: "3", nodeId: "2", state }],
      });
    });
    const client = { call: call as SpokeClient["call"] };
    expect((await fetchGraphSnapshot(client, options)).markers[0]?.state).toBe("PENDING");
    state = "FINALIZED";
    expect((await fetchGraphSnapshot(client, options)).markers[0]?.state).toBe("FINALIZED");
    state = "removed";
    const replayed = await fetchGraphSnapshot(client, options);
    expect(replayed.nodes.size).toBe(0);
    expect(replayed.markers).toEqual([]);
    expect(call).toHaveBeenCalledTimes(6);
  });
  it("does not convert an unavailable provider into an empty successful network", async () => {
    const error = new ClientError({ code: "API_UNREACHABLE", message: "Offline" });
    const client = { call: vi.fn().mockRejectedValue(error) as SpokeClient["call"] };
    await expect(fetchGraphSnapshot(client, options)).rejects.toBe(error);
  });
});
