import type { ClientOutput } from "@spoke/protocol";
import { units } from "../../../../demo/world/catalog";
import type { DemoCampaign } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { blockAt } from "../views/basics";
import {
  proceedsLedgerOf,
  proceedsLedgerWire,
  rewardLedgerOf,
  rewardLedgerWire,
} from "../views/settlement";

type Reconciliation = ClientOutput<"reports.preview">["reconciliation"];
type Mismatch = Reconciliation["mismatches"][number];
type RewardLedger = ReturnType<typeof rewardLedgerOf>;
type ProceedsLedger = ReturnType<typeof proceedsLedgerOf>;

export const DRILL_DRIFT = units(2, 50);

const rewardKeys = [
  "netDeposited",
  "available",
  "pendingReserved",
  "vestedUnclaimed",
  "rewardsClaimed",
  "surplusWithdrawn",
] as const;

const proceedsKeys = [
  "proceedsPending",
  "proceedsClaimable",
  "proceedsClaimed",
  "buyerRefunded",
] as const;

const emptyReward = (): RewardLedger => ({
  netDeposited: 0n,
  available: 0n,
  pendingReserved: 0n,
  vestedUnclaimed: 0n,
  rewardsClaimed: 0n,
  surplusWithdrawn: 0n,
});

const emptyProceeds = (): ProceedsLedger => ({
  proceedsPending: 0n,
  proceedsClaimable: 0n,
  proceedsClaimed: 0n,
  buyerRefunded: 0n,
});

const chainView = (campaign: DemoCampaign, indexed: RewardLedger): RewardLedger => {
  if (!campaign.drill) return indexed;
  const shift = indexed.vestedUnclaimed < DRILL_DRIFT ? indexed.vestedUnclaimed : DRILL_DRIFT;
  return {
    ...indexed,
    vestedUnclaimed: indexed.vestedUnclaimed - shift,
    rewardsClaimed: indexed.rewardsClaimed + DRILL_DRIFT,
  };
};

const differences = (
  campaign: DemoCampaign,
  indexed: RewardLedger,
  chain: RewardLedger,
): Mismatch[] =>
  rewardKeys
    .filter((key) => indexed[key] !== chain[key])
    .map((key) => ({
      campaignId: campaign.id,
      field: key,
      indexed: indexed[key].toString(),
      canonical: chain[key].toString(),
    }));

export const reconcile = (
  world: DemoWorld,
  campaigns: readonly DemoCampaign[],
  now: number,
): Reconciliation => {
  const rewardIndex = emptyReward();
  const rewardChain = emptyReward();
  const proceeds = emptyProceeds();
  const mismatches: Mismatch[] = [];
  for (const campaign of campaigns) {
    const indexed = rewardLedgerOf(world, campaign);
    const chain = chainView(campaign, indexed);
    const payments = proceedsLedgerOf(world, campaign);
    for (const key of rewardKeys) {
      rewardIndex[key] += indexed[key];
      rewardChain[key] += chain[key];
    }
    for (const key of proceedsKeys) proceeds[key] += payments[key];
    mismatches.push(...differences(campaign, indexed, chain));
  }
  return {
    matches: mismatches.length === 0,
    blockNumber: blockAt(now),
    rewardIndex: rewardLedgerWire(rewardIndex),
    rewardChain: rewardLedgerWire(rewardChain),
    proceedsIndex: proceedsLedgerWire(proceeds),
    proceedsChain: proceedsLedgerWire(proceeds),
    mismatches,
  };
};

export const drillCampaign = (campaigns: readonly DemoCampaign[]): DemoCampaign | undefined =>
  campaigns.find((campaign) => campaign.drill);
