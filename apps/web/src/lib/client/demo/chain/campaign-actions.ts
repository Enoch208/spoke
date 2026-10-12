import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { demoId, iso } from "../../../../demo/world/ids";
import { versionOf } from "../../../../demo/world/campaigns";
import type { DemoCampaign } from "../../../../demo/world/types";
import { campaignState, productOf, scheduledVersion } from "../views/catalog";
import { requireMerchant } from "../views/merchant-org";
import { proceedsLedgerOf, rewardLedgerOf } from "../views/settlement";
import { tokenKeyOf } from "../views/basics";
import type { ChainActionArgs, DemoTxResult } from "./actions";
import { campaignFor, merchantSigner, receipt, revert, spend, walletOf } from "./context";

const DAY = 86_400_000;

const status = (
  runtime: DemoRuntime,
  campaign: DemoCampaign,
  next: DemoCampaign["status"],
  kind: "activated" | "paused" | "resumed" | "ended",
) => {
  campaign.status = next;
  campaign.history.push({ kind, at: runtime.now() });
  return receipt(runtime, ["CampaignStatusChanged"], campaign.id);
};

export const createCampaign = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"createCampaign">,
): DemoTxResult => {
  const world = runtime.world;
  const merchant = requireMerchant(world, runtime.personaId());
  const record = world.drafts.find(
    (candidate) => candidate.draft.draftId === args.draftId && candidate.merchantId === merchant.id,
  );
  if (!record || record.draft.mode !== "create")
    return revert("InvalidPolicy", "Save the campaign draft before launching it.");
  if (record.launchedCampaignId !== null)
    return revert(
      "InvalidSchedule",
      "This draft's campaign already exists. Finish its launch instead.",
    );
  const product =
    productOf(world, record.draft.productId) ??
    revert("InvalidPrice", "The draft's product no longer exists.");
  const token =
    tokenKeyOf(world, record.draft.policy.rewardToken) ??
    revert("TokenNotAllowed", "Rewards must be paid in a sample token.");
  const now = runtime.now();
  const id = demoId("c", world.campaigns.length + 1);
  world.campaigns.push({
    id,
    merchantId: merchant.id,
    productId: product.id,
    token,
    createdAt: now,
    endsAt: Date.parse(record.draft.endsAt),
    status: "unfunded",
    inviteOnly: record.draft.inviteOnly,
    trustMode: "NATIVE_ONCHAIN",
    kind: "standard",
    policies: [versionOf(1, now, now, record.draft.policy)],
    budgetAlertSales: merchant.budgetAlertSales,
    hidden: false,
    drill: false,
    history: [],
  });
  record.launchedCampaignId = id;
  return receipt(runtime, ["CampaignCreated"], id);
};

export const fundCampaign = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"fundCampaign">,
): DemoTxResult => {
  const campaign = campaignFor(runtime, args.campaignId);
  const signer = merchantSigner(runtime, campaign);
  const state = campaignState(campaign, runtime.now());
  if (state === "ENDED" || state === "EXPIRED")
    return revert("CampaignIsEnded", "Ended campaigns can't take more budget.");
  const amount = BigInt(args.amount);
  if (amount === 0n) return revert("ZeroAmount", "Add an amount above zero.");
  spend(walletOf(runtime, signer), campaign.token, amount);
  runtime.world.fundings.push({
    id: demoId("fund", `${campaign.id}-${String(runtime.nextId("fund"))}`),
    campaignId: campaign.id,
    kind: "deposited",
    amount,
    at: runtime.now(),
  });
  return receipt(runtime, ["CampaignFunded"], campaign.id);
};

export const activateCampaign = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"activateCampaign">,
): DemoTxResult => {
  const campaign = campaignFor(runtime, args.campaignId);
  merchantSigner(runtime, campaign);
  if (campaign.status !== "unfunded")
    return revert("CampaignActive", "This campaign is already live.");
  if (rewardLedgerOf(runtime.world, campaign).netDeposited === 0n)
    return revert("CampaignNotFunded", "Fund the reward budget before going live.");
  return status(runtime, campaign, "active", "activated");
};

export const pause = (runtime: DemoRuntime, args: ChainActionArgs<"pause">): DemoTxResult => {
  const campaign = campaignFor(runtime, args.campaignId);
  merchantSigner(runtime, campaign);
  if (campaignState(campaign, runtime.now()) !== "FUNDED_ACTIVE")
    return revert("CampaignNotActive", "Only a live campaign can be paused.");
  return status(runtime, campaign, "paused", "paused");
};

export const resume = (runtime: DemoRuntime, args: ChainActionArgs<"resume">): DemoTxResult => {
  const campaign = campaignFor(runtime, args.campaignId);
  merchantSigner(runtime, campaign);
  if (campaignState(campaign, runtime.now()) !== "PAUSED")
    return revert("CampaignNotActive", "Only a paused campaign can be resumed.");
  return status(runtime, campaign, "active", "resumed");
};

export const end = (runtime: DemoRuntime, args: ChainActionArgs<"end">): DemoTxResult => {
  const campaign = campaignFor(runtime, args.campaignId);
  merchantSigner(runtime, campaign);
  if (campaign.status === "ended")
    return revert("CampaignIsEnded", "This campaign has already ended.");
  return status(runtime, campaign, "ended", "ended");
};

export const withdrawUnused = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"withdrawUnused">,
): DemoTxResult => {
  const campaign = campaignFor(runtime, args.campaignId);
  const signer = merchantSigner(runtime, campaign);
  if (campaignState(campaign, runtime.now()) === "FUNDED_ACTIVE")
    return revert("CampaignActive", "Pause or end the campaign before withdrawing unused budget.");
  const available = rewardLedgerOf(runtime.world, campaign).available;
  if (available <= 0n) return revert("NothingToClaim", "There's no unused budget to withdraw.");
  walletOf(runtime, signer)[campaign.token] += available;
  runtime.world.fundings.push({
    id: demoId("fund", `${campaign.id}-w${String(runtime.nextId("fund"))}`),
    campaignId: campaign.id,
    kind: "withdrawn",
    amount: available,
    at: runtime.now(),
  });
  return receipt(runtime, ["SurplusReturned"], campaign.id);
};

export const claimProceeds = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"claimProceeds">,
): DemoTxResult => {
  const world = runtime.world;
  const campaign = campaignFor(runtime, args.campaignId);
  const signer = merchantSigner(runtime, campaign);
  const amount = proceedsLedgerOf(world, campaign).proceedsClaimable;
  if (amount === 0n) return revert("NothingToClaim", "No proceeds are ready to claim yet.");
  const id = demoId("claim", world.claims.length + 1);
  for (const sale of world.sales)
    if (
      sale.campaignId === campaign.id &&
      sale.status === "FINALIZED" &&
      sale.proceedsClaimId === null
    )
      sale.proceedsClaimId = id;
  world.claims.push({
    id,
    claimant: signer,
    token: campaign.token,
    amount,
    at: runtime.now(),
    source: "SALE_PROCEEDS",
    campaignId: campaign.id,
  });
  walletOf(runtime, signer)[campaign.token] += amount;
  return receipt(runtime, ["MerchantProceedsClaimed"], id);
};

export const registerPolicyVersion = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"registerPolicyVersion">,
): DemoTxResult => {
  const campaign = campaignFor(runtime, args.campaignId);
  merchantSigner(runtime, campaign);
  const now = runtime.now();
  const effectiveAt = Date.parse(args.effectiveAt);
  const current = campaign.policies.at(-1);
  if (scheduledVersion(campaign, now))
    return revert("PolicyVersionPending", "New terms are already scheduled for this campaign.");
  if (effectiveAt < now + DAY)
    return revert(
      "PolicyNoticeTooShort",
      `New terms need at least 24 hours' notice. The earliest is ${iso(now + DAY)}.`,
    );
  if (current && current.policy.rewardToken.toLowerCase() !== args.policy.rewardToken.toLowerCase())
    return revert("PolicyTokenImmutable", "The reward token can't change.");
  campaign.policies.push(versionOf((current?.version ?? 0) + 1, now, effectiveAt, args.policy));
  return receipt(runtime, ["PolicyVersionRegistered"], campaign.id);
};
