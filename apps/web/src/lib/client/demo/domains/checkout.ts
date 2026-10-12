import type { ClientOutput, ContractErrorName, ErrorCode } from "@spoke/protocol";
import { MINUTE, demoId, iso } from "../../../../demo/world/ids";
import { pathOf, policyAt, quote } from "../../../../demo/world/sale-math";
import type { DemoCampaign, DemoNode } from "../../../../demo/world/types";
import type { CheckoutIntent, DemoWorld } from "../../../../demo/world/world";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import {
  DEMO_PROTOCOL_ADDRESS,
  addressesOf,
  balanceOf,
  blockAt,
  personByAddress,
} from "../views/basics";
import {
  campaignOf,
  campaignState,
  isMerchantOfCampaign,
  priceOf,
  productOf,
  scheduledVersion,
} from "../views/catalog";
import { nodeIndex, nodeOf, prospectivePath } from "../views/graph";
import { rewardLedgerOf } from "../views/settlement";

type Blocking = { code: ErrorCode; contractError: ContractErrorName | null } | null;
type Preview = ClientOutput<"checkout.preview">;

const stateBlock = (campaign: DemoCampaign, now: number): Blocking => {
  const state = campaignState(campaign, now);
  if (state === "PAUSED") return { code: "CAMPAIGN_PAUSED", contractError: "CampaignIsPaused" };
  if (state === "ENDED" || state === "EXPIRED")
    return { code: "CAMPAIGN_NOT_ACTIVE", contractError: "CampaignIsEnded" };
  if (state === "CREATED_UNFUNDED")
    return { code: "CAMPAIGN_NOT_ACTIVE", contractError: "CampaignNotActive" };
  return null;
};

export interface PurchaseCheck {
  campaign: DemoCampaign;
  path: DemoNode[];
  blocking: Blocking;
  alreadyPurchasedSaleId: string | null;
  buyerOnPath: boolean;
  buyerIsMerchant: boolean;
}

export const checkPurchase = (
  world: DemoWorld,
  campaignId: string,
  nodeId: string | undefined,
  buyer: string | undefined,
  now: number,
): PurchaseCheck => {
  const campaign = found(campaignOf(world, campaignId), "Campaign");
  const node =
    nodeId === undefined || nodeId === "0" ? undefined : found(nodeOf(world, nodeId), "Link");
  if (node && node.campaignId !== campaign.id)
    return fail("INVALID_REFERRAL_PATH", "That link belongs to another campaign.");
  const path = node ? pathOf(nodeIndex(world), node.id) : [];
  const buyerPerson = buyer === undefined ? undefined : personByAddress(world, buyer);
  const buyerAddresses = buyerPerson
    ? addressesOf(world, buyerPerson.id).map((address) => address.toLowerCase())
    : buyer
      ? [buyer.toLowerCase()]
      : [];
  const buyerOnPath = path.some((entry) => buyerAddresses.includes(entry.owner.toLowerCase()));
  const buyerIsMerchant =
    buyerPerson !== undefined && isMerchantOfCampaign(world, buyerPerson.id, campaign);
  const previous = world.sales.find(
    (sale) =>
      sale.campaignId === campaign.id &&
      buyerAddresses.includes(sale.buyer.toLowerCase()) &&
      sale.status !== "REFUNDED",
  );
  const reserved = quote(campaign, priceOf(world, campaign), path, now, path.length === 0).reserved;
  const exhausted = path.length > 0 && rewardLedgerOf(world, campaign).available < reserved;
  const blocking: Blocking =
    stateBlock(campaign, now) ??
    (previous ? { code: "DUPLICATE_CHECKOUT", contractError: "BuyerAlreadyPurchased" } : null) ??
    (buyerOnPath || (buyerIsMerchant && path.length > 0)
      ? { code: "SELF_REFERRAL", contractError: "SelfReferral" }
      : null) ??
    (exhausted
      ? { code: "INSUFFICIENT_REWARD_ESCROW", contractError: "InsufficientRewardEscrow" }
      : null);
  return {
    campaign,
    path,
    blocking,
    alreadyPurchasedSaleId: previous?.id ?? null,
    buyerOnPath,
    buyerIsMerchant,
  };
};

const preview = (runtime: DemoRuntime, input: DemoInput<"checkout.preview">): Preview => {
  const world = runtime.world;
  const now = runtime.now();
  const check = checkPurchase(world, input.campaignId, input.node, input.buyer, now);
  const { campaign, path } = check;
  const version = policyAt(campaign, now);
  const terms = quote(campaign, priceOf(world, campaign), path, now, path.length === 0);
  const next = scheduledVersion(campaign, now);
  const product = found(productOf(world, campaign.productId), "Product");
  const balance = input.buyer === undefined ? undefined : balanceOf(world, input.buyer);
  const recipients = prospectivePath(world, campaign, path, runtime.personaId(), now).filter(
    (entry) => entry.paid,
  );
  return {
    price: product.price.toString(),
    recipients,
    rewardTotal: terms.reserved.toString(),
    unallocated: terms.unallocated.toString(),
    policyHash: version.hash,
    policyVersion: version.version,
    nextPolicy: next ? { policyHash: next.hash, effectiveAt: iso(next.effectiveAt) } : null,
    directPurchaseAvailable:
      campaignState(campaign, now) === "FUNDED_ACTIVE" && check.alreadyPurchasedSaleId === null,
    blockNumber: blockAt(now),
    holdSeconds: version.policy.holdSeconds,
    refundPolicy: product.refundPolicy,
    blocking: check.blocking,
    ...(input.buyer === undefined
      ? {}
      : {
          buyer: {
            tokenBalance: (
              (campaign.token === "sdeur" ? balance?.sdeur : balance?.sdusd) ?? 0n
            ).toString(),
            allowance: (balance?.allowance ?? 0n).toString(),
            monWei: (balance?.mon ?? 0n).toString(),
            alreadyPurchasedSaleId: check.alreadyPurchasedSaleId,
            buyerOnPath: check.buyerOnPath,
            buyerIsMerchant: check.buyerIsMerchant,
          },
        }),
  };
};

const refreshed = (world: DemoWorld, intent: CheckoutIntent, now: number): CheckoutIntent => {
  const sale = world.sales.find((candidate) => candidate.orderKey === intent.orderKey);
  if (sale) {
    intent.saleId = sale.id;
    intent.status = "confirmed";
  } else if (intent.status === "created" && now > Date.parse(intent.expiresAt))
    intent.status = "expired";
  return intent;
};

const myIntent = (runtime: DemoRuntime, id: string) => {
  const intent = found(
    runtime.world.intents.find((candidate) => candidate.id === id),
    "Checkout",
  );
  const mine = addressesOf(runtime.world, runtime.personaId()).map((address) =>
    address.toLowerCase(),
  );
  return mine.includes(intent.buyer.toLowerCase())
    ? intent
    : fail("NOT_AUTHORIZED", "This checkout belongs to another account.");
};

export const checkoutReads = {
  "checkout.preview": (input, runtime) => preview(runtime, input),
  "checkout.getIntent": (input, runtime) =>
    refreshed(runtime.world, myIntent(runtime, input.id), runtime.now()),
} satisfies PartialHandlers<"checkout">;

export const checkoutWrites = {
  "checkout.createIntent": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const buyer =
      addressesOf(world, runtime.personaId())[0] ?? fail("UNAUTHENTICATED", "Sign in to buy.");
    const existing = world.intents.find((intent) => intent.orderKey === input.orderKey);
    if (existing) return refreshed(world, existing, now);
    const campaign = found(campaignOf(world, input.campaignId), "Campaign");
    const version = policyAt(campaign, now);
    if (version.hash !== input.policyHash)
      return fail(
        "POLICY_MISMATCH",
        "The campaign's terms changed. Review the new split before paying.",
      );
    if (priceOf(world, campaign).toString() !== input.expectedPrice)
      return fail("PRODUCT_VERSION_MISMATCH", "The price changed. Review it before paying.");
    const intent: CheckoutIntent = {
      id: demoId("intent", runtime.nextId("intent")),
      campaignId: campaign.id,
      nodeId: input.nodeId,
      orderKey: input.orderKey,
      expectedPrice: input.expectedPrice,
      expectedReward: input.expectedReward,
      policyHash: input.policyHash,
      chainId: input.chainId,
      buyer,
      status: "created",
      txHash: null,
      saleId: null,
      createdAt: iso(now),
      expiresAt: iso(now + 30 * MINUTE),
      to: DEMO_PROTOCOL_ADDRESS,
      data: "0x",
      value: "0",
    };
    world.intents.push(intent);
    return intent;
  },
  "checkout.attachTransaction": (input, runtime) => {
    const intent = myIntent(runtime, input.id);
    intent.txHash = input.txHash;
    if (intent.status === "created") intent.status = "submitted";
    return refreshed(runtime.world, intent, runtime.now());
  },
} satisfies PartialHandlers<"checkout">;
