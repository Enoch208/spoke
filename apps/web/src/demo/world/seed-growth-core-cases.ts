import { getAddress } from "viem";
import type { PublicActor, TxRef } from "../../lib/client/demo/views/basics";
import { demoId, iso } from "./ids";
import type { DemoCore, DemoMerchant, DemoNode, DemoSale } from "./types";
import type { Dispute } from "./world";

export type DisputeEvent = Dispute["events"][number];

export interface CaseContext {
  core: DemoCore;
  merchant: DemoMerchant;
  nodesById: ReadonlyMap<string, DemoNode>;
}

export type CaseEvent = readonly [
  at: number,
  actor: PublicActor,
  kind: string,
  message: string,
  tx?: TxRef | null,
];

export interface CaseSpec {
  key: string;
  sale: DemoSale;
  kind: Dispute["kind"];
  status: Dispute["status"];
  reason: string;
  message: string;
  events: readonly CaseEvent[];
}

export const merchantActor = (merchant: DemoMerchant): PublicActor => ({
  address: merchant.address,
  handle: null,
  displayName: merchant.name,
  visibility: "public",
});

export const buyerActor = (address: string): PublicActor => ({
  address: getAddress(address),
  handle: null,
  displayName: null,
  visibility: "private",
});

export const namedActor = (displayName: string): PublicActor => ({
  address: null,
  handle: null,
  displayName,
  visibility: "public",
});

export const eventOf = (
  disputeId: string,
  index: number,
  at: number,
  actor: PublicActor,
  kind: string,
  message: string,
  tx: TxRef | null = null,
): DisputeEvent => ({
  id: `${disputeId}-e${String(index)}`,
  at: iso(at),
  actor,
  kind,
  message,
  tx,
});

export const caseOf = (spec: CaseSpec): Dispute => {
  const id = demoId("dispute", spec.key);
  return {
    id,
    saleId: spec.sale.id,
    campaignId: spec.sale.campaignId,
    kind: spec.kind,
    status: spec.status,
    reason: spec.reason,
    message: spec.message,
    createdAt: iso(spec.events[0]?.[0] ?? spec.sale.purchasedAt),
    events: spec.events.map(([at, actor, kind, message, tx], index) =>
      eventOf(id, index + 1, at, actor, kind, message, tx ?? null),
    ),
  };
};

export const latest = (sales: readonly DemoSale[]): DemoSale | undefined =>
  sales.reduce<DemoSale | undefined>(
    (best, sale) => (best === undefined || sale.purchasedAt > best.purchasedAt ? sale : best),
    undefined,
  );

export const settledIn = (context: CaseContext, campaign: number, before: number) =>
  latest(
    context.core.sales.filter(
      (sale) =>
        sale.campaignId === demoId("c", campaign) &&
        sale.status === "FINALIZED" &&
        sale.nodeId !== null &&
        sale.purchasedAt <= before,
    ),
  );

export const pathOwners = (sale: DemoSale): Set<string> =>
  new Set(sale.allocations.map((allocation) => allocation.owner.toLowerCase()));

export const ownerOf = (context: CaseContext, sale: DemoSale): string | undefined =>
  sale.nodeId === null ? undefined : context.nodesById.get(sale.nodeId)?.owner.toLowerCase();
