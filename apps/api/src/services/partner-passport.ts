import { z } from "zod";
import { partnerPassport } from "@spoke/protocol";
import type { Services } from "../types.js";
import type { ReputationFacts } from "./reputation.js";
import { allocations, campaignProduct } from "./views.js";
import { actorView } from "./evidence.js";
import { nativeToken } from "./catalog.js";
import { timestamp } from "./read-utils.js";

export async function passportView(services: Services, facts: ReputationFacts, owner: boolean) {
  const wallet = facts.address.toLowerCase();
  const history = new Map<
    string,
    { month: string; direct: number; network: number; receiptIds: string[] }
  >();
  let claimed = 0n;
  let claimable = 0n;
  const contributions = facts.settled.map((receipt) => {
    const shares = allocations.parse(receipt.payload.allocations);
    const index = shares.findIndex((share) => share.recipient.toLowerCase() === wallet);
    const share = shares[index];
    const event = facts.finalized.find((event) => event.payload.saleId === receipt.id);
    if (!share || !event) throw new Error("Missing canonical settlement evidence");
    const month = event.at.toISOString().slice(0, 7);
    const point = history.get(month) ?? { month, direct: 0, network: 0, receiptIds: [] };
    point[share.depth === 0 ? "direct" : "network"]++;
    point.receiptIds.push(receipt.id);
    history.set(month, point);
    const claims = z.array(z.boolean()).parse(receipt.payload.allocationClaims ?? []);
    if (claims[index]) claimed += BigInt(share.amount);
    else claimable += BigInt(share.amount);
    return { receipt, direct: share.depth === 0 };
  });
  const positions = await Promise.all(
    facts.nodes.map(async (node) => {
      const campaignId = z.string().parse(node.payload.campaignId);
      const campaign = await services.store.require("campaign", campaignId);
      const product = await campaignProduct(services.store, campaign);
      const relevant = contributions.filter(
        ({ receipt }) => receipt.payload.campaignId === campaignId,
      );
      return {
        campaignId,
        title: product.title,
        merchant: await actorView(services.store, campaign.owner),
        nodeId: node.id,
        parentNodeId: node.payload.parentId,
        joinedAt: timestamp(node.payload.createdAt),
        direct: relevant.filter((item) => item.direct).length,
        network: relevant.filter((item) => !item.direct).length,
        receiptIds: relevant.map(({ receipt }) => receipt.id),
      };
    }),
  );
  return partnerPassport.parse({
    history: [...history.values()].sort((a, b) => a.month.localeCompare(b.month)),
    positions: positions.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)),
    rewards: owner
      ? {
          token: nativeToken(services.chain.token),
          claimable: claimable.toString(),
          claimed: claimed.toString(),
          receiptIds: facts.settled.map((receipt) => receipt.id),
        }
      : null,
  });
}
