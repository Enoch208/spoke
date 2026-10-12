import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import type { DemoClaim, DemoNode, DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { actor, demoTx, tokenInfo, type PublicActor } from "../views/basics";

type ProofEvent = ClientOutput<"system.events">[number];
type Args = ProofEvent["args"];

const event = (
  name: string,
  label: string,
  at: number,
  who: PublicActor | null,
  args: Args,
): ProofEvent => ({
  name,
  tx: demoTx(label, at),
  logIndex: 0,
  at: iso(at),
  actor: who,
  args,
});

const nodeEvent = (world: DemoWorld, node: DemoNode) =>
  event("NodeCreated", `node:${node.id}`, node.createdAt, actor(world, node.owner), {
    campaignId: node.campaignId,
    nodeId: node.id,
    parentNodeId: node.parentId ?? "0",
  });

const reserved = (sale: DemoSale) =>
  sale.allocations.reduce((sum, allocation) => sum + allocation.amount, 0n);

const saleEvents = (sale: DemoSale): ProofEvent[] => {
  const ids = { saleId: sale.id, campaignId: sale.campaignId };
  const rows = [
    event("NativePurchaseAccepted", `sale:${sale.id}:purchase`, sale.purchasedAt, null, {
      ...ids,
      nodeId: sale.nodeId ?? "0",
      policyVersion: sale.policyVersion,
      price: sale.price.toString(),
      rewardReserved: reserved(sale).toString(),
      unlockAt: iso(sale.unlockAt),
    }),
  ];
  if (sale.finalizedAt !== null)
    rows.push(
      event("SaleFinalized", `sale:${sale.id}:finalize`, sale.finalizedAt, null, {
        ...ids,
        merchantAmount: sale.price.toString(),
        commissionAmount: reserved(sale).toString(),
      }),
    );
  if (sale.refundedAt !== null)
    rows.push(
      event("SaleRefunded", `sale:${sale.id}:refund`, sale.refundedAt, null, {
        ...ids,
        price: sale.price.toString(),
        releasedReward: reserved(sale).toString(),
      }),
    );
  return rows;
};

const claimEvent = (world: DemoWorld, claim: DemoClaim): ProofEvent => {
  const token = tokenInfo(world, claim.token).address;
  if (claim.source === "REWARD")
    return event("RewardClaimed", `claim:${claim.id}`, claim.at, actor(world, claim.claimant), {
      token,
      amount: claim.amount.toString(),
    });
  const merchant = world.merchants.find((candidate) => candidate.address === claim.claimant);
  const who: PublicActor | null = merchant
    ? { address: merchant.address, handle: null, displayName: merchant.name, visibility: "public" }
    : null;
  return event("MerchantProceedsClaimed", `claim:${claim.id}`, claim.at, who, {
    campaignId: claim.campaignId ?? "0",
    token,
    amount: claim.amount.toString(),
  });
};

export const protocolEvents = (
  world: DemoWorld,
  now: number,
  name: string | undefined,
  limit: number,
) =>
  [
    ...world.nodes.map((node) => nodeEvent(world, node)),
    ...world.sales.flatMap(saleEvents),
    ...world.claims.map((claim) => claimEvent(world, claim)),
  ]
    .filter((row) => (name === undefined || row.name === name) && Date.parse(row.at) <= now)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.name.localeCompare(b.name))
    .slice(0, limit);
