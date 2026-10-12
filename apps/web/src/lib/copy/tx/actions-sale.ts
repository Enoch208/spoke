import { required } from "../required";
import type { TxActionCopy } from "./actions-shape";

const createNode = {
  name: "Create my link",
  label: "Create your link",
  steps: ["Create link"],
  idle: "Create my link",
  beforeConfirm: {
    root: "Records your link for {campaignName} onchain. You earn only when a purchase through your link, or a link shared from it, settles.",
    child: "Your link will sit under {parentHandle}’s link. That can’t be changed later.",
    always: "Creating a link costs a small network fee and never costs SDUSD.",
  },
  progress: "Creating your link…",
  success: {
    title: "Your link is ready",
    body: "Share it anywhere. If someone buys through it, your share of the commission is reserved, then claimable after the hold.",
    actions: ["Share", "Copy link"],
  },
  toast: { text: "Your link is ready", action: "Copy link" },
  failures: [
    "NodeAlreadyRegistered",
    "InvalidParent",
    "UnknownNode",
    "CampaignIsPaused",
    "CampaignIsEnded",
    "CampaignCapacityReached",
    "NOT_ELIGIBLE",
    "SELF_REFERRAL",
  ],
  summary: {
    campaign: "Campaign {campaign}",
    underParent: "Under {parentHandle}’s link",
    root: "Directly from {merchant}",
  },
} as const satisfies TxActionCopy;

const directPurchaseLine = "Nobody earns a commission on this purchase.";

const purchase = {
  name: "Buy",
  label: "Buy {product}",
  steps: ["Allow {price}", "Pay {price}"],
  idle: "Buy for {price}",
  beforeConfirm: [
    "You pay {price} · testnet to {merchantName}. The merchant can refund it for {holdDuration} after purchase; then the sale settles.",
  ],
  disclosure: {
    id: "D-03",
    short: "Shared by {handle}, who may earn part of this sale’s commission.",
  },
  stepHelpers: {
    pay: "Confirm the payment of {price}. You can still cancel in your wallet.",
  },
  progress: { line: required.awaitingPurchase, button: "Paying…" },
  success: {
    title: "Purchase complete",
    body: "You paid {price} · testnet to {merchantName}. Your access is ready.",
    hold: required.pendingHold,
    proof: required.pendingSale,
    actions: ["Open your purchase", "View receipt"],
  },
  toast: { text: "Purchase complete", action: "Open" },
  resume:
    "You have a purchase in progress for this item. We’re checking its status instead of charging you again.",
  direct: { line: directPurchaseLine },
  budgetExhausted: {
    line: required.budgetDepleted,
    choice: "Buy without rewards",
    directLine: directPurchaseLine,
  },
  selfReferral: {
    line: required.selfReferral,
    choice: "Buy directly",
    directLine: directPurchaseLine,
  },
  cancelledAfterAllow:
    "You cancelled the purchase. Your approval of {price} stays in place, so trying again is one step. Nothing was charged.",
  failures: [
    "CAMPAIGN_PAUSED",
    "CAMPAIGN_NOT_ACTIVE",
    "INSUFFICIENT_REWARD_ESCROW",
    "SELF_REFERRAL",
    "DUPLICATE_CHECKOUT",
    "BuyerAlreadyPurchased",
    "INVALID_REFERRAL_PATH",
    "PRODUCT_VERSION_MISMATCH",
    "POLICY_MISMATCH",
    "PAYMENT_ALLOWANCE_INSUFFICIENT",
    "INSUFFICIENT_SDUSD",
    "INSUFFICIENT_MON",
  ],
  summary: {
    pay: "You pay {price}",
    referredBy: "Referred by {handle}",
    direct: "No referral · nobody earns a commission",
    reserved: "Rewards reserved from {merchant}’s budget {reward}",
    refundable: "Refundable by {merchant} for {hold} after purchase",
    token: required.demoToken,
  },
} as const satisfies TxActionCopy;

const refund = {
  name: "Refund sale",
  label: "Refund sale #{saleId}",
  steps: ["Refund sale"],
  idle: "Refund {price}",
  beforeConfirm: [
    "Returns {price} to the buyer and cancels {commission} in pending commissions for {shareCount} people. Possible until {unlockAt}. This can’t be undone.",
  ],
  confirmation: "I understand this can’t be undone",
  progress: "Refunding…",
  success: {
    title: "Sale refunded",
    body: required.refunded,
    followUp: "{commission} is back in the available reward budget.",
    actions: ["Done"],
  },
  toast: { text: "Sale #{saleId} refunded" },
  failures: [
    "REFUND_WINDOW_CLOSED",
    "SALE_REFUNDED",
    "SALE_ALREADY_FINALIZED",
    "NOT_AUTHORIZED_TO_REFUND",
  ],
  summary: [
    "{buyer} gets back {price}",
    "Rewards cancelled {reward}",
    "Refund window closes {unlockAt}",
  ],
} as const satisfies TxActionCopy;

export const saleTxActions = { createNode, purchase, refund } as const;
