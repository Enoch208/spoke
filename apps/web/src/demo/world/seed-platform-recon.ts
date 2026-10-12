import { blockAt } from "../../lib/client/demo/views/basics";
import { units } from "./catalog";
import { HOUR, MINUTE, demoId } from "./ids";
import { systemEvent, type AuditEvent } from "./seed-platform-audit";
import type { DemoCore, DemoSale } from "./types";
import type { Reconciliation } from "./world";

export const RECONCILED_TOKEN = "sdusd";
export const SEEDED_RUNS = 16;
export const RUN_EVERY = 3 * HOUR;
export const INDEXER_DRIFT = units(2, 50);

interface Ledgers {
  netDeposited: bigint;
  available: bigint;
  pendingReserved: bigint;
  vestedUnclaimed: bigint;
  rewardsClaimed: bigint;
  surplusWithdrawn: bigint;
  proceedsPending: bigint;
  proceedsClaimable: bigint;
  proceedsClaimed: bigint;
  buyerRefunded: bigint;
}

const total = (values: readonly bigint[]) => values.reduce((sum, value) => sum + value, 0n);

const allocated = (
  sales: readonly DemoSale[],
  keep: (sale: DemoSale, claimed: boolean) => boolean,
) =>
  total(
    sales.flatMap((sale) =>
      sale.allocations
        .filter((allocation) => keep(sale, allocation.claimId !== null))
        .map((allocation) => allocation.amount),
    ),
  );

const priced = (sales: readonly DemoSale[], keep: (sale: DemoSale) => boolean) =>
  total(sales.filter(keep).map((sale) => sale.price));

export const campaignLedgers = (core: DemoCore, campaignId: string): Ledgers => {
  const sales = core.sales.filter((sale) => sale.campaignId === campaignId);
  const fundings = core.fundings.filter((funding) => funding.campaignId === campaignId);
  const netDeposited = total(
    fundings.filter((row) => row.kind === "deposited").map((row) => row.amount),
  );
  const surplusWithdrawn = total(
    fundings.filter((row) => row.kind === "withdrawn").map((row) => row.amount),
  );
  const pendingReserved = allocated(sales, (sale) => sale.status === "PENDING");
  const vestedUnclaimed = allocated(
    sales,
    (sale, claimed) => sale.status === "FINALIZED" && !claimed,
  );
  const rewardsClaimed = allocated(
    sales,
    (sale, claimed) => sale.status === "FINALIZED" && claimed,
  );
  return {
    netDeposited,
    available: netDeposited - pendingReserved - vestedUnclaimed - rewardsClaimed - surplusWithdrawn,
    pendingReserved,
    vestedUnclaimed,
    rewardsClaimed,
    surplusWithdrawn,
    proceedsPending: priced(sales, (sale) => sale.status === "PENDING"),
    proceedsClaimable: priced(
      sales,
      (sale) => sale.status === "FINALIZED" && sale.proceedsClaimId === null,
    ),
    proceedsClaimed: priced(
      sales,
      (sale) => sale.status === "FINALIZED" && sale.proceedsClaimId !== null,
    ),
    buyerRefunded: priced(sales, (sale) => sale.status === "REFUNDED"),
  };
};

const combine = (rows: readonly Ledgers[]): Ledgers => {
  const field = (key: keyof Ledgers) => total(rows.map((row) => row[key]));
  return {
    netDeposited: field("netDeposited"),
    available: field("available"),
    pendingReserved: field("pendingReserved"),
    vestedUnclaimed: field("vestedUnclaimed"),
    rewardsClaimed: field("rewardsClaimed"),
    surplusWithdrawn: field("surplusWithdrawn"),
    proceedsPending: field("proceedsPending"),
    proceedsClaimable: field("proceedsClaimable"),
    proceedsClaimed: field("proceedsClaimed"),
    buyerRefunded: field("buyerRefunded"),
  };
};

const rewardWire = (ledgers: Ledgers) => ({
  netDeposited: ledgers.netDeposited.toString(),
  available: ledgers.available.toString(),
  pendingReserved: ledgers.pendingReserved.toString(),
  vestedUnclaimed: ledgers.vestedUnclaimed.toString(),
  rewardsClaimed: ledgers.rewardsClaimed.toString(),
  surplusWithdrawn: ledgers.surplusWithdrawn.toString(),
});

const proceedsWire = (ledgers: Ledgers) => ({
  proceedsPending: ledgers.proceedsPending.toString(),
  proceedsClaimable: ledgers.proceedsClaimable.toString(),
  proceedsClaimed: ledgers.proceedsClaimed.toString(),
  buyerRefunded: ledgers.buyerRefunded.toString(),
});

export const reconcile = (core: DemoCore, at: number, drift: bigint): Reconciliation => {
  const reconciled = core.campaigns.filter((campaign) => campaign.token === RECONCILED_TOKEN);
  const chain = combine(reconciled.map((campaign) => campaignLedgers(core, campaign.id)));
  const drill = drift > 0n ? reconciled.find((campaign) => campaign.drill) : undefined;
  const shift = drill ? drift : 0n;
  const index = {
    ...chain,
    pendingReserved: chain.pendingReserved + shift,
    available: chain.available - shift,
  };
  const canonical = drill ? campaignLedgers(core, drill.id).pendingReserved : 0n;
  const mismatches = drill
    ? [
        {
          campaignId: drill.id,
          field: "reserved",
          indexed: (canonical + shift).toString(),
          canonical: canonical.toString(),
        },
      ]
    : [];
  return {
    matches: mismatches.length === 0,
    blockNumber: blockAt(at),
    rewardIndex: rewardWire(index),
    rewardChain: rewardWire(chain),
    proceedsIndex: proceedsWire(index),
    proceedsChain: proceedsWire(chain),
    mismatches,
  };
};

export const runAt = (anchor: number, n: number) =>
  anchor - 30 * MINUTE - (SEEDED_RUNS - n) * RUN_EVERY;

export const seededRuns = (core: DemoCore): Reconciliation[] =>
  Array.from({ length: SEEDED_RUNS }, (_, index) => {
    const n = index + 1;
    return reconcile(core, runAt(core.anchor, n), n >= SEEDED_RUNS - 1 ? INDEXER_DRIFT : 0n);
  });

export const runEvents = (core: DemoCore): AuditEvent[] => {
  const events = Array.from({ length: SEEDED_RUNS }, (_, index) =>
    systemEvent(
      "reconciliation",
      `reconciliation:${demoId("recon", index + 1)}`,
      "reconciliationRun",
      runAt(core.anchor, index + 1),
    ),
  );
  const firstMismatch = runAt(core.anchor, SEEDED_RUNS - 1);
  const drill = core.campaigns.find((campaign) => campaign.drill);
  if (drill)
    events.push(
      systemEvent("reconciliation", `campaign:${drill.id}`, "alertRaised", firstMismatch + MINUTE),
    );
  return events;
};
