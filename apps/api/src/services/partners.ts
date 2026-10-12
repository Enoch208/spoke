import { z } from "zod";
import { partnerRow, partnerDetail } from "@spoke/protocol";
import type { Services } from "../types.js";
import { ApiProblem } from "../http/problem.js";
import { allRecords, timestamp, zeroBuckets } from "./read-utils.js";
import { reputationFacts } from "./reputation.js";
import { discoveryView } from "./discovery.js";
import { allocations } from "./views.js";
import { allocationBucket } from "./earnings.js";

export const partnerView = async (
  services: Services,
  address: string,
  ids: Set<string>,
  atBlock?: bigint,
) => {
  const facts = await reputationFacts(services, address, ids);
  const allNodes = (await allRecords(services.store, "node")).filter((row) =>
    ids.has(z.string().parse(row.payload.campaignId)),
  );
  const nodes = allNodes.filter((row) => row.owner === address.toLowerCase());
  if (!nodes.length) throw new ApiProblem(404, "NOT_FOUND", "No such partner in your campaigns.");
  const block = await services.chain.client.getBlock(
    atBlock === undefined ? {} : { blockNumber: atBlock },
  );
  const rewards = zeroBuckets();
  const sales = [];
  for (const row of facts.receipts) {
    const split = allocations.parse(row.payload.allocations);
    const index = split.findIndex((item) => item.recipient.toLowerCase() === address.toLowerCase());
    const allocation = split[index];
    if (!allocation) continue;
    const bucket = allocationBucket(row, index, block.timestamp);
    rewards[bucket] = (BigInt(rewards[bucket]) + BigInt(allocation.amount)).toString();
    sales.push({
      saleId: row.id,
      level: allocation.depth + 1,
      amount: allocation.amount,
      state: bucket === "atRisk" || bucket === "readyToFinalize" ? "reserved" : bucket,
    });
  }
  const dates = nodes.map((node) => timestamp(node.payload.createdAt)).sort();
  const partner = partnerRow.parse({
    ...discoveryView(facts, [], "ranked", true).card,
    linkCount: nodes.length,
    directSales: facts.direct,
    networkSales: facts.network,
    settledValue: facts.netAttributedValue,
    rewards,
    firstLinkAt: dates[0],
    lastSettledAt: facts.lastSettledAt,
  });
  return {
    facts,
    lastLinkAt: dates[dates.length - 1] ?? null,
    detail: partnerDetail.parse({
      partner,
      nodes: nodes.map((node) => ({
        nodeId: node.id,
        parentNodeId: node.payload.parentId,
        childCount: allNodes.filter((row) => row.payload.parentId === node.id).length,
      })),
      sales,
      rewards,
    }),
  };
};
