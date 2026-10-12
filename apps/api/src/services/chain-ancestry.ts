import { z } from "zod";
import { spokeProtocolAbi } from "@spoke/protocol";
import type { StoredRecord } from "../db/store.js";
import type { Services } from "../types.js";
import { ApiProblem } from "../http/problem.js";
import { wire } from "./chain.js";

export const chainAncestry = async (services: Services, nodeId: string, blockNumber: bigint) => {
  const address = await services.chain.ready();
  const rows: StoredRecord[] = [];
  let id = nodeId;
  let campaignId: bigint | undefined;
  const seen = new Set<string>();
  while (id !== "0") {
    if (seen.has(id) || rows.length >= 256)
      throw new ApiProblem(503, "UPSTREAM_UNAVAILABLE", "Canonical referral ancestry is invalid.");
    seen.add(id);
    const node = await services.chain.client.readContract({
      address,
      abi: spokeProtocolAbi,
      functionName: "getNode",
      args: [BigInt(id)],
      blockNumber,
    });
    if (node.campaignId === 0n || (campaignId !== undefined && node.campaignId !== campaignId))
      throw new ApiProblem(
        400,
        "INVALID_REFERRAL_PATH",
        "Referral path is not part of one campaign.",
      );
    campaignId = node.campaignId;
    const at = new Date(Number(node.createdAt) * 1000);
    rows.push({
      kind: "node",
      id,
      owner: node.creator.toLowerCase(),
      payload: z.record(z.string(), z.unknown()).parse(wire({ ...node, nodeId: id })),
      createdAt: at,
      updatedAt: at,
    });
    id = node.parentId.toString();
  }
  return rows;
};
