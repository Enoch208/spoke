import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import type { DemoCampaign, TokenKey } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, type PartialHandlers } from "../handler";
import { blockAt, demoTx, page, sum, tokenInfo, tokenKeyOf } from "../views/basics";
import { rewardPerSale } from "../views/catalog";
import { requireMerchant } from "../views/merchant-org";
import {
  proceedsLedgerOf,
  proceedsLedgerWire,
  rewardLedgerOf,
  rewardLedgerWire,
  salesOf,
} from "../views/settlement";

type Movement = ClientOutput<"vault.movements">["items"][number];

const movementsOf = (world: DemoWorld, campaign: DemoCampaign): Movement[] => {
  const token = tokenInfo(world, campaign.token);
  const base = { token, campaignId: campaign.id };
  const rows: Movement[] = world.fundings
    .filter((funding) => funding.campaignId === campaign.id)
    .map((funding) => ({
      ...base,
      kind: funding.kind,
      amount: funding.amount.toString(),
      source: "REWARD",
      saleId: null,
      tx: demoTx(`funding:${funding.id}`, funding.at),
      at: iso(funding.at),
    }));
  for (const sale of salesOf(world, campaign.id)) {
    const reserved = sum(sale.allocations.map((allocation) => allocation.amount)).toString();
    if (sale.allocations.length)
      rows.push({
        ...base,
        kind: "reserved",
        amount: reserved,
        source: "REWARD",
        saleId: sale.id,
        tx: demoTx(`sale:${sale.id}:purchase`, sale.purchasedAt),
        at: iso(sale.purchasedAt),
      });
    if (sale.finalizedAt !== null)
      rows.push({
        ...base,
        kind: "finalized",
        amount: sale.price.toString(),
        source: "SALE_PROCEEDS",
        saleId: sale.id,
        tx: demoTx(`sale:${sale.id}:finalize`, sale.finalizedAt),
        at: iso(sale.finalizedAt),
      });
    if (sale.refundedAt !== null)
      rows.push({
        ...base,
        kind: "refunded",
        amount: sale.price.toString(),
        source: "SALE_PROCEEDS",
        saleId: sale.id,
        tx: demoTx(`sale:${sale.id}:refund`, sale.refundedAt),
        at: iso(sale.refundedAt),
      });
  }
  for (const claim of world.claims) {
    const covered = salesOf(world, campaign.id).flatMap((sale) =>
      sale.allocations.filter((allocation) => allocation.claimId === claim.id),
    );
    const amount =
      claim.campaignId === campaign.id
        ? claim.amount
        : sum(covered.map((allocation) => allocation.amount));
    if (amount > 0n)
      rows.push({
        ...base,
        kind: "claimed",
        amount: amount.toString(),
        source: claim.source,
        saleId: null,
        tx: demoTx(`claim:${claim.id}`, claim.at),
        at: iso(claim.at),
      });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
};

const campaignEntry = (world: DemoWorld, campaign: DemoCampaign, now: number) => ({
  campaignId: campaign.id,
  token: tokenInfo(world, campaign.token),
  rewards: rewardLedgerWire(rewardLedgerOf(world, campaign)),
  proceeds: proceedsLedgerWire(proceedsLedgerOf(world, campaign)),
  rewardPerSale: rewardPerSale(world, campaign, now).toString(),
  liabilityCap: campaign.policies.at(-1)?.policy.campaignLiabilityCap ?? "0",
  settledSalesReadyToFinalize: salesOf(world, campaign.id)
    .filter((sale) => sale.status === "PENDING" && now >= sale.unlockAt)
    .map((sale) => sale.id),
});

const totalFor = (world: DemoWorld, campaigns: readonly DemoCampaign[], token: TokenKey) => {
  const rewards = campaigns.map((campaign) => rewardLedgerOf(world, campaign));
  const proceeds = campaigns.map((campaign) => proceedsLedgerOf(world, campaign));
  return {
    token: tokenInfo(world, token),
    rewards: rewardLedgerWire({
      netDeposited: sum(rewards.map((ledger) => ledger.netDeposited)),
      available: sum(rewards.map((ledger) => ledger.available)),
      pendingReserved: sum(rewards.map((ledger) => ledger.pendingReserved)),
      vestedUnclaimed: sum(rewards.map((ledger) => ledger.vestedUnclaimed)),
      rewardsClaimed: sum(rewards.map((ledger) => ledger.rewardsClaimed)),
      surplusWithdrawn: sum(rewards.map((ledger) => ledger.surplusWithdrawn)),
    }),
    proceeds: proceedsLedgerWire({
      proceedsPending: sum(proceeds.map((ledger) => ledger.proceedsPending)),
      proceedsClaimable: sum(proceeds.map((ledger) => ledger.proceedsClaimable)),
      proceedsClaimed: sum(proceeds.map((ledger) => ledger.proceedsClaimed)),
      buyerRefunded: sum(proceeds.map((ledger) => ledger.buyerRefunded)),
    }),
  };
};

const ownCampaigns = (
  world: DemoWorld,
  merchantId: string,
  campaignId: string | undefined,
  token: string | undefined,
) => {
  const key = tokenKeyOf(world, token);
  const campaigns = world.campaigns.filter(
    (campaign) =>
      campaign.merchantId === merchantId &&
      campaign.status !== "unfunded" &&
      (campaignId === undefined || campaign.id === campaignId) &&
      (key === null || campaign.token === key),
  );
  if (campaignId !== undefined && !campaigns.length)
    return fail("NOT_FOUND", "That campaign isn't one of this business's funded campaigns.");
  return campaigns;
};

export const vaultReads = {
  "vault.get": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = requireMerchant(world, runtime.personaId());
    const campaigns = ownCampaigns(world, merchant.id, input.campaignId, input.token);
    const tokens = [...new Set(campaigns.map((campaign) => campaign.token))];
    return {
      campaigns: campaigns.map((campaign) => campaignEntry(world, campaign, now)),
      totals: tokens.map((token) =>
        totalFor(
          world,
          campaigns.filter((campaign) => campaign.token === token),
          token,
        ),
      ),
      lastIndexedBlock: blockAt(now),
      blockNumber: blockAt(now),
    };
  },
  "vault.movements": (input, runtime) => {
    const world = runtime.world;
    const merchant = requireMerchant(world, runtime.personaId());
    const rows = ownCampaigns(world, merchant.id, input.campaignId, undefined)
      .flatMap((campaign) => movementsOf(world, campaign))
      .filter((row) => input.kind === undefined || row.kind === input.kind)
      .sort((a, b) => b.at.localeCompare(a.at));
    return page(rows, input);
  },
} satisfies PartialHandlers<"vault">;

export const vaultWrites = {} satisfies PartialHandlers<"vault">;
