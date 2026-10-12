import { computeReward, type CampaignState, type ClientOutput } from "@spoke/protocol";
import { iso, sampleHash } from "../../../../demo/world/ids";
import { policyAt } from "../../../../demo/world/sale-math";
import type {
  DemoCampaign,
  DemoMerchant,
  DemoPolicyVersion,
  DemoProduct,
} from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { DEMO_CHAIN_ID, DEMO_PROTOCOL_ADDRESS, tokenInfo } from "./basics";
import { countsOf, rewardLedgerOf, salesOf } from "./settlement";

export type CampaignCard = ClientOutput<"campaigns.get">;
export type ProductWire = ClientOutput<"products.get">;
export type MerchantWire = ClientOutput<"merchants.get">;
export type PolicyWire = ClientOutput<"campaigns.policy">["current"];

export const campaignState = (campaign: DemoCampaign, now: number): CampaignState => {
  if (campaign.status === "unfunded") return "CREATED_UNFUNDED";
  if (campaign.status === "ended") return "ENDED";
  if (now >= campaign.endsAt) return "EXPIRED";
  return campaign.status === "paused" ? "PAUSED" : "FUNDED_ACTIVE";
};

export const isLive = (campaign: DemoCampaign, now: number) =>
  campaignState(campaign, now) === "FUNDED_ACTIVE";

export const scheduledVersion = (campaign: DemoCampaign, now: number): DemoPolicyVersion | null =>
  campaign.policies.find((version) => version.effectiveAt > now) ?? null;

export const policyWire = (version: DemoPolicyVersion): PolicyWire => ({
  ...version.policy,
  policyHash: version.hash,
  version: version.version,
  effectiveAt: iso(version.effectiveAt),
  regions: [],
  sharingRules: [],
});

export const productOf = (world: DemoWorld, id: string): DemoProduct | undefined =>
  world.products.find((product) => product.id === id);
export const merchantOf = (world: DemoWorld, id: string): DemoMerchant | undefined =>
  world.merchants.find((merchant) => merchant.id === id);
export const campaignOf = (world: DemoWorld, id: string): DemoCampaign | undefined =>
  world.campaigns.find((campaign) => campaign.id === id);

export const priceOf = (world: DemoWorld, campaign: DemoCampaign): bigint =>
  productOf(world, campaign.productId)?.price ?? 0n;

export const rewardPerSale = (world: DemoWorld, campaign: DemoCampaign, now: number): bigint => {
  const policy = policyAt(campaign, now).policy;
  return computeReward(priceOf(world, campaign), policy.commissionBps, BigInt(policy.perSaleCap));
};

export const isExhausted = (world: DemoWorld, campaign: DemoCampaign, now: number): boolean =>
  campaign.status !== "unfunded" &&
  rewardLedgerOf(world, campaign).available < rewardPerSale(world, campaign, now);

export const productWire = (world: DemoWorld, product: DemoProduct): ProductWire => ({
  id: product.id,
  merchantId: product.merchantId,
  title: product.title,
  summary: product.summary,
  outcome: product.outcome,
  description: product.description,
  media: world.assets.filter((entry) => entry.productId === product.id).map((entry) => entry.asset),
  priceBaseUnits: product.price.toString(),
  token: tokenInfo(world, product.token),
  category: product.category,
  fulfillmentMode: product.fulfillmentMode,
  version: product.version,
  skuHash: sampleHash(`sku:${product.id}:${String(product.version)}`),
  refundPolicy: product.refundPolicy,
  variants: product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    priceBaseUnits: variant.price.toString(),
  })),
  billingPeriod: product.billingPeriod,
});

export const merchantWire = (
  world: DemoWorld,
  merchant: DemoMerchant,
  now: number,
): MerchantWire => ({
  id: merchant.id,
  name: merchant.name,
  slug: merchant.slug,
  address: merchant.address,
  description: merchant.description,
  logo: null,
  website: merchant.website,
  verificationTier: merchant.verificationTier,
  joinedAt: iso(merchant.joinedAt),
  offersCount: world.campaigns.filter(
    (campaign) => campaign.merchantId === merchant.id && isLive(campaign, now),
  ).length,
  closedAt: merchant.closedAt === null ? null : iso(merchant.closedAt),
});

export const campaignCard = (world: DemoWorld, campaign: DemoCampaign, now: number) => {
  const merchant = merchantOf(world, campaign.merchantId);
  const product = productOf(world, campaign.productId);
  if (!merchant || !product)
    throw new RangeError(`Campaign ${campaign.id} is missing its merchant or product.`);
  const ledger = rewardLedgerOf(world, campaign);
  const productCard = productWire(world, product);
  return {
    campaignId: campaign.id,
    chainId: DEMO_CHAIN_ID,
    contractAddress: DEMO_PROTOCOL_ADDRESS,
    state: campaignState(campaign, now),
    merchant: { name: merchant.name, slug: merchant.slug, address: merchant.address },
    product: {
      id: product.id,
      title: product.title,
      summary: product.summary,
      media: productCard.media,
      category: product.category,
    },
    token: tokenInfo(world, campaign.token),
    price: product.price.toString(),
    policy: policyWire(policyAt(campaign, now)),
    rewardAvailable: (ledger.available > 0n ? ledger.available : 0n).toString(),
    rewardTotal: ledger.netDeposited.toString(),
    settledSales: countsOf(salesOf(world, campaign.id)).finalized,
    onchainUrl: `https://usespoke.xyz/c/${campaign.id}`,
    rankReasons: rankReasons(world, campaign, now),
  };
};

const rankReasons = (world: DemoWorld, campaign: DemoCampaign, now: number): string[] => {
  const ledger = rewardLedgerOf(world, campaign);
  const perSale = rewardPerSale(world, campaign, now);
  const reasons = [`Pays ${String(policyAt(campaign, now).policy.maxRewardedAncestors)} levels`];
  if (perSale > 0n)
    reasons.push(`Budget left for ${(ledger.available / perSale).toString()} sales`);
  const settled = countsOf(salesOf(world, campaign.id)).finalized;
  if (settled) reasons.push(`${String(settled)} settled sales`);
  return reasons;
};

export const isMerchantOfCampaign = (world: DemoWorld, personId: string, campaign: DemoCampaign) =>
  merchantOf(world, campaign.merchantId)?.ownerId === personId;
