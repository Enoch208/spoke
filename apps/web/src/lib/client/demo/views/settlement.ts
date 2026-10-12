import type { DemoAllocation, DemoCampaign, DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { sum } from "./basics";

export type AllocationState = "reserved" | "claimable" | "claimed" | "refunded" | "reversed";
export type Bucket =
  "atRisk" | "readyToFinalize" | "claimable" | "claimed" | "refunded" | "reversed";
export type SixBuckets = Record<Bucket, string>;

export const allocationState = (sale: DemoSale, allocation: DemoAllocation): AllocationState => {
  if (sale.status === "REFUNDED") return sale.reversed ? "reversed" : "refunded";
  if (sale.status === "PENDING") return "reserved";
  return allocation.claimId === null ? "claimable" : "claimed";
};

export const bucketOf = (sale: DemoSale, allocation: DemoAllocation, now: number): Bucket => {
  const state = allocationState(sale, allocation);
  if (state === "reserved") return now < sale.unlockAt ? "atRisk" : "readyToFinalize";
  return state;
};

export const emptyBuckets = (): Record<Bucket, bigint> => ({
  atRisk: 0n,
  readyToFinalize: 0n,
  claimable: 0n,
  claimed: 0n,
  refunded: 0n,
  reversed: 0n,
});

export const bucketsWire = (buckets: Record<Bucket, bigint>): SixBuckets => ({
  atRisk: buckets.atRisk.toString(),
  readyToFinalize: buckets.readyToFinalize.toString(),
  claimable: buckets.claimable.toString(),
  claimed: buckets.claimed.toString(),
  refunded: buckets.refunded.toString(),
  reversed: buckets.reversed.toString(),
});

export const addBucket = (
  buckets: Record<Bucket, bigint>,
  sale: DemoSale,
  allocation: DemoAllocation,
  now: number,
) => {
  buckets[bucketOf(sale, allocation, now)] += allocation.amount;
};

export const salesOf = (world: DemoWorld, campaignId: string): DemoSale[] =>
  world.sales.filter((sale) => sale.campaignId === campaignId);

export const rewardLedgerOf = (world: DemoWorld, campaign: DemoCampaign) => {
  const sales = salesOf(world, campaign.id);
  const allocations = (filter: (sale: DemoSale, allocation: DemoAllocation) => boolean) =>
    sum(
      sales.flatMap((sale) =>
        sale.allocations
          .filter((allocation) => filter(sale, allocation))
          .map((allocation) => allocation.amount),
      ),
    );
  const fundings = world.fundings.filter((funding) => funding.campaignId === campaign.id);
  const netDeposited = sum(
    fundings.filter((funding) => funding.kind === "deposited").map((funding) => funding.amount),
  );
  const surplusWithdrawn = sum(
    fundings.filter((funding) => funding.kind === "withdrawn").map((funding) => funding.amount),
  );
  const pendingReserved = allocations((sale) => sale.status === "PENDING");
  const vestedUnclaimed = allocations(
    (sale, allocation) => sale.status === "FINALIZED" && allocation.claimId === null,
  );
  const rewardsClaimed = allocations(
    (sale, allocation) => sale.status === "FINALIZED" && allocation.claimId !== null,
  );
  const available =
    netDeposited - pendingReserved - vestedUnclaimed - rewardsClaimed - surplusWithdrawn;
  return {
    netDeposited,
    available,
    pendingReserved,
    vestedUnclaimed,
    rewardsClaimed,
    surplusWithdrawn,
  };
};

export const proceedsLedgerOf = (world: DemoWorld, campaign: DemoCampaign) => {
  const sales = salesOf(world, campaign.id);
  const total = (filter: (sale: DemoSale) => boolean) =>
    sum(sales.filter(filter).map((sale) => sale.price));
  return {
    proceedsPending: total((sale) => sale.status === "PENDING"),
    proceedsClaimable: total(
      (sale) => sale.status === "FINALIZED" && sale.proceedsClaimId === null,
    ),
    proceedsClaimed: total((sale) => sale.status === "FINALIZED" && sale.proceedsClaimId !== null),
    buyerRefunded: total((sale) => sale.status === "REFUNDED"),
  };
};

export const rewardLedgerWire = (ledger: ReturnType<typeof rewardLedgerOf>) => ({
  netDeposited: ledger.netDeposited.toString(),
  available: ledger.available.toString(),
  pendingReserved: ledger.pendingReserved.toString(),
  vestedUnclaimed: ledger.vestedUnclaimed.toString(),
  rewardsClaimed: ledger.rewardsClaimed.toString(),
  surplusWithdrawn: ledger.surplusWithdrawn.toString(),
});

export const proceedsLedgerWire = (ledger: ReturnType<typeof proceedsLedgerOf>) => ({
  proceedsPending: ledger.proceedsPending.toString(),
  proceedsClaimable: ledger.proceedsClaimable.toString(),
  proceedsClaimed: ledger.proceedsClaimed.toString(),
  buyerRefunded: ledger.buyerRefunded.toString(),
});

export const countsOf = (sales: readonly DemoSale[]) => ({
  pending: sales.filter((sale) => sale.status === "PENDING").length,
  finalized: sales.filter((sale) => sale.status === "FINALIZED").length,
  refunded: sales.filter((sale) => sale.status === "REFUNDED").length,
});
