import {
  computeReward,
  hashPolicy,
  type ClientOutput,
  type CommissionPolicy,
} from "@spoke/protocol";
import { DAY, iso, sampleHash } from "../../../../demo/world/ids";
import { policyAt } from "../../../../demo/world/sale-math";
import type { DemoCampaign, DemoId } from "../../../../demo/world/types";
import type { CampaignDraft, DemoDraftRecord, DemoWorld } from "../../../../demo/world/world";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import { actor, page } from "../views/basics";
import {
  campaignOf,
  campaignState,
  productOf,
  rewardPerSale,
  scheduledVersion,
} from "../views/catalog";
import { requireMerchant } from "../views/merchant-org";
import {
  addBucket,
  bucketsWire,
  countsOf,
  emptyBuckets,
  proceedsLedgerOf,
  rewardLedgerOf,
  salesOf,
} from "../views/settlement";
import { statusFilterOf } from "./campaigns-filter";

type Row = ClientOutput<"campaigns.mine">["items"][number];

const sourceOf = (campaign: DemoCampaign) =>
  campaign.kind === "external"
    ? "external_store"
    : campaign.kind === "subscription"
      ? "subscription"
      : "spoke_checkout";

const campaignRow = (world: DemoWorld, campaign: DemoCampaign, now: number): Row => {
  const sales = salesOf(world, campaign.id);
  const scheduled = scheduledVersion(campaign, now);
  return {
    campaignId: campaign.id,
    draftId: null,
    state: campaignState(campaign, now),
    productTitle: productOf(world, campaign.productId)?.title ?? "",
    rewardPerSale: rewardPerSale(world, campaign, now).toString(),
    policy: policyAt(campaign, now).policy,
    source: sourceOf(campaign),
    trustMode: campaign.trustMode,
    eligibility: campaign.inviteOnly ? "invitation_only" : "open",
    availableRewards: rewardLedgerOf(world, campaign).available.toString(),
    pendingSales: countsOf(sales).pending,
    proceedsClaimable: proceedsLedgerOf(world, campaign).proceedsClaimable.toString(),
    sales: countsOf(sales),
    links: world.nodes.filter((node) => node.campaignId === campaign.id).length,
    budgetAlertSales: campaign.budgetAlertSales,
    endsAt: iso(campaign.endsAt),
    scheduledPolicyHash: scheduled?.hash ?? null,
  };
};

const draftRow = (world: DemoWorld, record: DemoDraftRecord, alert: number): Row => {
  const product = productOf(world, record.draft.productId);
  const policy = record.draft.policy;
  return {
    campaignId: null,
    draftId: record.draft.draftId,
    state: "DRAFT_OFFCHAIN",
    productTitle: product?.title ?? "",
    rewardPerSale: computeReward(
      product?.price ?? 0n,
      policy.commissionBps,
      BigInt(policy.perSaleCap),
    ).toString(),
    policy,
    source: "spoke_checkout",
    trustMode: "NATIVE_ONCHAIN",
    eligibility: record.draft.inviteOnly ? "invitation_only" : "open",
    availableRewards: "0",
    pendingSales: 0,
    proceedsClaimable: "0",
    sales: { pending: 0, finalized: 0, refunded: 0 },
    links: 0,
    budgetAlertSales: alert,
    endsAt: record.draft.endsAt,
    scheduledPolicyHash: null,
  };
};

const draftOf = (world: DemoWorld, merchantId: string, draftId: string) =>
  found(
    world.drafts.find(
      (record) => record.draft.draftId === draftId && record.merchantId === merchantId,
    ),
    "Draft",
  );

const policyDiff = (before: CommissionPolicy, after: CommissionPolicy) => {
  const fields = [
    "commissionBps",
    "perSaleCap",
    "campaignLiabilityCap",
    "maxRewardedAncestors",
    "weightsBps",
    "shortPathMode",
    "holdSeconds",
  ] as const;
  return fields
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({ field, before: before[field], after: after[field] }));
};

const saveDraft = (
  input: DemoInput<"campaigns.saveDraft">,
  world: DemoWorld,
  merchantId: DemoId,
  now: number,
): CampaignDraft => {
  const request = input.draft;
  const existing = world.drafts.find((record) => record.draft.draftId === input.id);
  if (existing && existing.merchantId !== merchantId)
    return fail("NOT_AUTHORIZED", "That draft belongs to another business.");
  if (existing && existing.draft.version !== request.version)
    return fail("CONFLICT", "This draft changed in another tab. Reload it to continue.");
  if (Date.parse(request.endsAt) > now + 365 * DAY)
    return fail("VALIDATION_FAILED", "A campaign can run for at most 365 days.");
  const campaign =
    request.campaignId === undefined
      ? undefined
      : found(campaignOf(world, request.campaignId), "Campaign");
  const productId =
    campaign?.productId ?? request.productId ?? fail("VALIDATION_FAILED", "Pick a product first.");
  const product = found(productOf(world, productId), "Product");
  const draft: CampaignDraft = {
    draftId: input.id,
    version: (existing?.draft.version ?? 0) + 1,
    savedAt: iso(now),
    stepReached: request.stepReached,
    mode: request.mode,
    productId,
    productVersion: request.productVersion ?? product.version,
    policy: request.policy,
    endsAt: request.endsAt,
    inviteOnly: request.inviteOnly,
    ...(campaign ? { campaignId: campaign.id } : {}),
    ...(request.effectiveAt === undefined ? {} : { effectiveAt: request.effectiveAt }),
  };
  if (existing) existing.draft = draft;
  else world.drafts.push({ merchantId, draft, launchedCampaignId: null });
  return draft;
};

export const campaignMerchantReads = {
  "campaigns.mine": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = requireMerchant(world, runtime.personaId());
    const campaigns = world.campaigns.filter((campaign) => campaign.merchantId === merchant.id);
    const drafts = world.drafts.filter(
      (record) =>
        record.merchantId === merchant.id &&
        record.draft.mode === "create" &&
        record.launchedCampaignId === null,
    );
    const rows = [
      ...drafts.map((record) => draftRow(world, record, merchant.budgetAlertSales)),
      ...campaigns.map((campaign) => campaignRow(world, campaign, now)),
    ];
    const countsByState: Record<string, number> = {};
    for (const row of rows) countsByState[row.state] = (countsByState[row.state] ?? 0) + 1;
    const visible =
      input.status === undefined
        ? rows
        : campaigns
            .filter((campaign) => statusFilterOf(campaign, now) === input.status)
            .map((campaign) => campaignRow(world, campaign, now));
    return { ...page(visible, input), countsByState };
  },
  "campaigns.getDraft": (input, runtime) =>
    draftOf(runtime.world, requireMerchant(runtime.world, runtime.personaId()).id, input.id).draft,
  "campaigns.prepareCreate": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const record = draftOf(world, requireMerchant(world, runtime.personaId()).id, input.id);
    const draft = record.draft;
    const base = {
      metadataHash: sampleHash(`metadata:${draft.draftId}:${String(draft.version)}`),
      policy: draft.policy,
      policyHash: hashPolicy(draft.policy),
      eligibilityHash: draft.policy.eligibilityHash,
      productVersion: draft.productVersion,
      gasEstimate: null,
      cohortEnforcement: draft.inviteOnly ? ("onchain" as const) : ("offchain" as const),
    };
    if (draft.mode === "create") {
      const product = found(productOf(world, draft.productId), "Product");
      return {
        ...base,
        mode: "create",
        expectedEvents: ["CampaignCreated", "CampaignFunded", "CampaignActivated"],
        config: {
          skuHash: sampleHash(`sku:${product.id}:${String(product.version)}`),
          skuPrice: product.price.toString(),
        },
      };
    }
    const campaign = found(campaignOf(world, draft.campaignId ?? ""), "Campaign");
    const scheduled = scheduledVersion(campaign, now);
    if (scheduled)
      return fail(
        "VALIDATION_FAILED",
        `New terms are already scheduled for ${iso(scheduled.effectiveAt)}. You can change terms again after they apply.`,
      );
    return {
      ...base,
      mode: "newVersion",
      expectedEvents: ["PolicyVersionRegistered"],
      earliestEffectiveAt: iso(now + DAY),
      diff: policyDiff(policyAt(campaign, now).policy, draft.policy),
    };
  },
  "campaigns.distributors": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = requireMerchant(world, runtime.personaId());
    const campaign = found(campaignOf(world, input.campaignId), "Campaign");
    if (campaign.merchantId !== merchant.id)
      return fail("NOT_AUTHORIZED", "Only the campaign's merchant sees its distributors.");
    const nodes = world.nodes.filter((node) => node.campaignId === campaign.id);
    const sales = salesOf(world, campaign.id);
    const descendants = (nodeId: string): number =>
      nodes
        .filter((node) => node.parentId === nodeId)
        .reduce((total, node) => total + 1 + descendants(node.id), 0);
    const rows = nodes.map((node) => {
      const paid = sales.filter((sale) =>
        sale.allocations.some((allocation) => allocation.nodeId === node.id),
      );
      const buckets = emptyBuckets();
      for (const sale of paid)
        for (const allocation of sale.allocations)
          if (allocation.nodeId === node.id) addBucket(buckets, sale, allocation, now);
      const shown = actor(world, node.owner, true);
      const times = [
        node.createdAt,
        ...paid.map((sale) => sale.finalizedAt ?? sale.refundedAt ?? sale.purchasedAt),
      ];
      const invitation = world.invitations.find(
        (candidate) =>
          candidate.campaignId === campaign.id &&
          candidate.distributor.toLowerCase() === node.owner.toLowerCase(),
      );
      return {
        address: node.owner,
        handle: shown.handle,
        parentNodeId: node.parentId ?? "0",
        nodeId: node.id,
        linkCount: 1,
        descendants: descendants(node.id),
        directSales: sales.filter((sale) => sale.nodeId === node.id).length,
        paidSales: paid.length,
        rewards: bucketsWire(buckets),
        lastActivityAt: iso(Math.max(...times)),
        invitationStatus: invitation?.status ?? null,
      };
    });
    const ranked =
      input.sort === "recent"
        ? rows.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
        : rows.sort((a, b) => b.paidSales - a.paidSales);
    return page(ranked, input);
  },
} satisfies PartialHandlers<"campaigns">;

export const campaignMerchantWrites = {
  "campaigns.saveDraft": (input, runtime) =>
    saveDraft(
      input,
      runtime.world,
      requireMerchant(runtime.world, runtime.personaId()).id,
      runtime.now(),
    ),
  "campaigns.deleteDraft": (input, runtime) => {
    const world = runtime.world;
    const record = draftOf(world, requireMerchant(world, runtime.personaId()).id, input.id);
    if (record.launchedCampaignId !== null)
      return fail(
        "VALIDATION_FAILED",
        "This draft's launch already started onchain, so it can't be deleted.",
      );
    world.drafts = world.drafts.filter((candidate) => candidate !== record);
    return { deleted: true as const };
  },
  "campaigns.updateSettings": (input, runtime) => {
    const world = runtime.world;
    const merchant = requireMerchant(world, runtime.personaId());
    const campaign = found(campaignOf(world, input.campaignId), "Campaign");
    if (campaign.merchantId !== merchant.id)
      return fail("NOT_AUTHORIZED", "Only the campaign's merchant can change its settings.");
    campaign.budgetAlertSales = input.budgetAlertSales;
    return { budgetAlertSales: campaign.budgetAlertSales };
  },
} satisfies PartialHandlers<"campaigns">;
