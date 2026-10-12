import { isHex } from "viem";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { demoId } from "../../../../demo/world/ids";
import { draftSale } from "../../../../demo/world/sale-math";
import type { DemoNode } from "../../../../demo/world/types";
import { addressesOf, personByAddress, tokenKeyOf } from "../views/basics";
import { campaignState, isMerchantOfCampaign, priceOf } from "../views/catalog";
import { nodeIndex, nodeOf } from "../views/graph";
import { saleOf } from "../views/receipt";
import { rewardLedgerOf } from "../views/settlement";
import { checkPurchase } from "../domains/checkout";
import type { ChainActionArgs, DemoTxResult } from "./actions";
import { campaignFor, receipt, revert, signerOf, spend, walletOf } from "./context";

const FAUCET_LIMIT = 1_000_000_000n;

const liveOrRevert = (runtime: DemoRuntime, campaignId: string) => {
  const campaign = campaignFor(runtime, campaignId);
  const state = campaignState(campaign, runtime.now());
  if (state === "PAUSED") return revert("CampaignIsPaused", "This campaign is paused.");
  if (state === "ENDED" || state === "EXPIRED")
    return revert("CampaignIsEnded", "This campaign has ended.");
  if (state === "CREATED_UNFUNDED")
    return revert("CampaignNotActive", "This campaign isn't open yet.");
  return campaign;
};

const nodeSlug = (runtime: DemoRuntime, owner: string, campaignNumber: string) => {
  const handle = personByAddress(runtime.world, owner)?.handle?.replace(/^demo-/, "");
  const base = handle ?? `link${String(runtime.nextId("link"))}`;
  const taken = (slug: string) =>
    runtime.world.nodes.some((node) => node.id === demoId("n", `${campaignNumber}-${slug}`));
  return taken(base) ? `${base}${String(runtime.nextId("link"))}` : base;
};

export const createNode = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"createNode">,
): DemoTxResult => {
  const world = runtime.world;
  const campaign = liveOrRevert(runtime, args.campaignId);
  const owner = signerOf(runtime);
  if (isMerchantOfCampaign(world, runtime.personaId(), campaign))
    return revert("SelfReferral", "Merchants can't create links in their own campaigns.");
  const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
  if (
    world.nodes.some(
      (node) => node.campaignId === campaign.id && mine.includes(node.owner.toLowerCase()),
    )
  )
    return revert("NodeAlreadyRegistered", "You already have a link in this campaign.");
  const parent =
    args.parentNodeId === "0"
      ? null
      : (nodeOf(world, args.parentNodeId) ??
        revert("InvalidParent", "That parent link doesn't exist."));
  if (parent && parent.campaignId !== campaign.id)
    return revert("InvalidParent", "The parent link belongs to another campaign.");
  const invited = world.invitations.some(
    (invitation) =>
      invitation.campaignId === campaign.id &&
      invitation.status === "accepted" &&
      mine.includes(invitation.distributor.toLowerCase()),
  );
  if (campaign.inviteOnly && !invited)
    return revert("InvalidReferralPath", "This campaign is invitation-only.");
  if (world.nodes.filter((node) => node.campaignId === campaign.id).length >= 256)
    return revert("CampaignCapacityReached", "This campaign has no room for more links.");
  const campaignNumber = campaign.id.replace(/^demo-c-/, "");
  const slug = nodeSlug(runtime, owner, campaignNumber);
  const node: DemoNode = {
    id: demoId("n", `${campaignNumber}-${slug}`),
    campaignId: campaign.id,
    parentId: parent?.id ?? null,
    owner,
    createdAt: runtime.now(),
    code: `demo-${slug}-${campaignNumber}`,
    moderation: "visible",
    moderationReason: null,
    visits: 0,
  };
  world.nodes.push(node);
  return receipt(runtime, ["NodeCreated"], node.id);
};

export const purchase = (runtime: DemoRuntime, args: ChainActionArgs<"purchase">): DemoTxResult => {
  const world = runtime.world;
  const now = runtime.now();
  const campaign = liveOrRevert(runtime, args.campaignId);
  const buyer = signerOf(runtime);
  if (world.sales.some((sale) => sale.orderKey.toLowerCase() === args.orderKey.toLowerCase()))
    return revert("OrderAlreadyUsed", "This order was already paid.");
  const check = checkPurchase(world, campaign.id, args.nodeId, buyer, now);
  if (check.alreadyPurchasedSaleId)
    return revert("BuyerAlreadyPurchased", "You already bought this.");
  if (check.buyerOnPath || (check.buyerIsMerchant && check.path.length > 0))
    return revert("SelfReferral", "You can't earn from your own purchase.");
  const nodeId =
    args.nodeId === "0"
      ? null
      : (check.path[0]?.id ?? revert("InvalidReferralPath", "That link isn't valid."));
  const orderKey = isHex(args.orderKey)
    ? args.orderKey
    : revert("InvalidReferralPath", "The order key must be 32 bytes of hex.");
  const sale = draftSale(
    demoId("s", world.sales.length + 1),
    {
      campaign,
      nodeId,
      buyer,
      orderKey,
      price: priceOf(world, campaign),
      purchasedAt: now,
      source: "native",
    },
    nodeIndex(world),
  );
  const reserved = sale.allocations.reduce((total, allocation) => total + allocation.amount, 0n);
  const available = rewardLedgerOf(world, campaign).available;
  if (reserved > available)
    return revert(
      "InsufficientRewardEscrow",
      "The reward budget can't cover this sale. Buy without rewards instead.",
    );
  spend(walletOf(runtime, buyer), campaign.token, sale.price);
  world.sales.push(sale);
  return receipt(
    runtime,
    sale.allocations.length
      ? ["NativePurchaseAccepted", "RewardReserved"]
      : ["NativePurchaseAccepted"],
    sale.id,
  );
};

const pendingSale = (runtime: DemoRuntime, saleId: string) => {
  const sale =
    saleOf(runtime.world, saleId) ??
    revert("UnknownSale", "That sale doesn't exist in the sample world.");
  if (sale.status === "FINALIZED")
    return revert("SaleAlreadyFinalized", "This sale is already final.");
  if (sale.status === "REFUNDED")
    return revert("SaleAlreadyRefunded", "This sale was already refunded.");
  return sale;
};

export const refund = (runtime: DemoRuntime, args: ChainActionArgs<"refund">): DemoTxResult => {
  const sale = pendingSale(runtime, args.saleId);
  const campaign = campaignFor(runtime, sale.campaignId);
  if (!isMerchantOfCampaign(runtime.world, runtime.personaId(), campaign))
    return revert("NotAuthorizedToRefund", "Only the merchant can refund a sale.");
  if (runtime.now() >= sale.unlockAt)
    return revert("RefundWindowClosed", "The hold has ended, so this sale can't be refunded.");
  sale.status = "REFUNDED";
  sale.refundedAt = runtime.now();
  walletOf(runtime, sale.buyer)[campaign.token] += sale.price;
  return receipt(runtime, ["SaleRefunded"], sale.id);
};

export const finalize = (runtime: DemoRuntime, args: ChainActionArgs<"finalize">): DemoTxResult => {
  const sale = pendingSale(runtime, args.saleId);
  if (runtime.now() < sale.unlockAt) return revert("SaleNotMature", "The hold hasn't ended yet.");
  sale.status = "FINALIZED";
  sale.finalizedAt = runtime.now();
  return receipt(
    runtime,
    sale.allocations.length ? ["SaleFinalized", "RewardVested"] : ["SaleFinalized"],
    sale.id,
  );
};

export const claimRewards = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"claimRewards">,
): DemoTxResult => {
  const world = runtime.world;
  const token =
    tokenKeyOf(world, args.token) ??
    revert("TokenNotAllowed", "That token isn't used by any sample campaign.");
  const claimant = signerOf(runtime);
  const owed = world.sales
    .filter(
      (sale) =>
        sale.status === "FINALIZED" && campaignFor(runtime, sale.campaignId).token === token,
    )
    .flatMap((sale) =>
      sale.allocations.filter(
        (allocation) =>
          allocation.claimId === null && allocation.owner.toLowerCase() === claimant.toLowerCase(),
      ),
    );
  const amount = owed.reduce((total, allocation) => total + allocation.amount, 0n);
  if (amount === 0n) return revert("NothingToClaim", "Nothing is claimable yet.");
  const id = demoId("claim", world.claims.length + 1);
  for (const allocation of owed) allocation.claimId = id;
  world.claims.push({
    id,
    claimant,
    token,
    amount,
    at: runtime.now(),
    source: "REWARD",
    campaignId: null,
  });
  walletOf(runtime, claimant)[token] += amount;
  return receipt(runtime, ["RewardClaimed"], id);
};

export const approve = (runtime: DemoRuntime, args: ChainActionArgs<"approve">): DemoTxResult => {
  walletOf(runtime, signerOf(runtime)).allowance = BigInt(args.amount);
  return receipt(runtime, ["Approval"]);
};

export const mintDemoTokens = (
  runtime: DemoRuntime,
  args: ChainActionArgs<"mintDemoTokens">,
): DemoTxResult => {
  const amount = BigInt(args.amount);
  if (amount === 0n) return revert("ZeroAmount", "Choose an amount above zero.");
  if (amount > FAUCET_LIMIT)
    return revert("FaucetLimitExceeded", "The faucet gives at most 1,000.00 SDUSD at a time.");
  walletOf(runtime, signerOf(runtime)).sdusd += amount;
  return receipt(runtime, ["Transfer"]);
};
