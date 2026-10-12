import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import type { DemoCampaign, DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import {
  DEMO_CHAIN_ID,
  DEMO_PROTOCOL_ADDRESS,
  actor,
  blockAt,
  demoTx,
  ownsAddress,
  tokenInfo,
  type TxRef,
} from "./basics";
import { campaignOf, isMerchantOfCampaign } from "./catalog";
import { allocationState } from "./settlement";

export type SaleReceipt = ClientOutput<"receipts.get">;

export const saleOf = (world: DemoWorld, saleId: string): DemoSale | undefined =>
  world.sales.find((sale) => sale.id === saleId);

export const purchaseTx = (sale: DemoSale): TxRef =>
  demoTx(`sale:${sale.id}:purchase`, sale.purchasedAt);
export const finalizeTx = (sale: DemoSale): TxRef | null =>
  sale.finalizedAt === null ? null : demoTx(`sale:${sale.id}:finalize`, sale.finalizedAt);
export const refundTx = (sale: DemoSale): TxRef | null =>
  sale.refundedAt === null ? null : demoTx(`sale:${sale.id}:refund`, sale.refundedAt);

export const claimTx = (world: DemoWorld, claimId: string | null): TxRef | null => {
  const claim =
    claimId === null ? undefined : world.claims.find((candidate) => candidate.id === claimId);
  return claim ? demoTx(`claim:${claim.id}`, claim.at) : null;
};

export const proceedsState = (sale: DemoSale): SaleReceipt["proceedsState"] => {
  if (sale.status === "REFUNDED") return "refunded";
  if (sale.status === "PENDING") return "pending";
  return sale.proceedsClaimId === null ? "claimable" : "claimed";
};

export const policyHashOf = (campaign: DemoCampaign, version: number) => {
  const match =
    campaign.policies.find((candidate) => candidate.version === version) ?? campaign.policies[0];
  if (!match) throw new RangeError(`Campaign ${campaign.id} has no policy.`);
  return match.hash;
};

const timelineOf = (sale: DemoSale): SaleReceipt["timeline"] => {
  const rows = [{ state: "PENDING", at: iso(sale.purchasedAt), tx: purchaseTx(sale) }];
  const finalized = finalizeTx(sale);
  const refunded = refundTx(sale);
  if (sale.finalizedAt !== null && finalized)
    rows.push({ state: "FINALIZED", at: iso(sale.finalizedAt), tx: finalized });
  if (sale.refundedAt !== null && refunded)
    rows.push({ state: "REFUNDED", at: iso(sale.refundedAt), tx: refunded });
  return rows;
};

export const refundRequestOf = (world: DemoWorld, sale: DemoSale) => {
  const request = world.disputes.find(
    (dispute) => dispute.kind === "refund_request" && dispute.saleId === sale.id,
  );
  return request
    ? { disputeId: request.id, status: request.status, createdAt: request.createdAt }
    : null;
};

export const saleReceipt = (
  world: DemoWorld,
  sale: DemoSale,
  viewerId: string,
  now: number,
): SaleReceipt => {
  const campaign = campaignOf(world, sale.campaignId);
  if (!campaign) throw new RangeError(`Sale ${sale.id} has no campaign.`);
  const isBuyer = ownsAddress(world, viewerId, sale.buyer);
  const reveal = isBuyer || isMerchantOfCampaign(world, viewerId, campaign);
  return {
    saleId: sale.id,
    campaignId: sale.campaignId,
    chainId: DEMO_CHAIN_ID,
    contractAddress: DEMO_PROTOCOL_ADDRESS,
    buyer: reveal ? sale.buyer : null,
    nodeId: sale.nodeId ?? "0",
    orderKey: sale.orderKey,
    policyHash: policyHashOf(campaign, sale.policyVersion),
    policyVersion: sale.policyVersion,
    source: sale.source,
    trustMode: campaign.trustMode,
    price: sale.price.toString(),
    rewardReserved: sale.allocations
      .reduce((total, allocation) => total + allocation.amount, 0n)
      .toString(),
    token: tokenInfo(world, campaign.token),
    state: sale.status,
    purchasedAt: iso(sale.purchasedAt),
    unlockAt: iso(sale.unlockAt),
    allocations: sale.allocations.map((allocation) => ({
      recipient: actor(world, allocation.owner, ownsAddress(world, viewerId, allocation.owner)),
      level: allocation.level,
      effectiveWeightBps: allocation.weightBps,
      amount: allocation.amount.toString(),
      state: allocationState(sale, allocation),
      claimTx: claimTx(world, allocation.claimId),
    })),
    proceedsState: proceedsState(sale),
    purchaseTx: purchaseTx(sale),
    finalizeTx: finalizeTx(sale),
    refundTx: refundTx(sale),
    indexedBlock: blockAt(now),
    timeline: timelineOf(sale),
    refundRequest: isBuyer ? refundRequestOf(world, sale) : null,
  };
};
