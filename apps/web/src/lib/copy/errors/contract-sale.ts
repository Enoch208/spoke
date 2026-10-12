import { required } from "../required";
import { apiErrors } from "./api";
import { clientErrors } from "./client";
import type { ContractErrorCopy } from "./contract-shape";

export const saleContractErrors = {
  SelfReferral: {
    code: "SELF_REFERRAL",
    contexts: ["purchase", "createNode"],
    ...apiErrors.SELF_REFERRAL,
    variants: {
      merchantCreateNode: {
        title: "Merchants can’t link their own campaign",
        body: "Merchants don’t earn commission on their own campaigns. Share the campaign page instead.",
        recovery: ["Copy campaign link"],
      },
    },
  },
  DuplicateCheckout: {
    code: "DUPLICATE_CHECKOUT",
    contexts: ["purchase"],
    ...apiErrors.DUPLICATE_CHECKOUT,
  },
  BuyerAlreadyPurchased: {
    code: "DUPLICATE_CHECKOUT",
    contexts: ["purchase"],
    title: "You’ve already bought this",
    body: "This campaign allows one purchase per account.",
    recovery: ["View purchase"],
    retryable: "no",
  },
  ZeroReward: {
    code: "CAMPAIGN_NOT_ACTIVE",
    contexts: ["purchase"],
    title: "This sale would earn no commission",
    body: "At this price the commission rounds to zero, so the campaign can’t accept it.",
    recovery: ["Back to campaign"],
    retryable: "no",
  },
  InsufficientRewardEscrow: {
    code: "INSUFFICIENT_REWARD_ESCROW",
    contexts: ["purchase"],
    ...apiErrors.INSUFFICIENT_REWARD_ESCROW,
  },
  UnexpectedTransferAmount: {
    code: "TOKEN_NOT_ALLOWED",
    contexts: ["fundCampaign", "purchase"],
    title: "The token transfer didn’t match",
    body: "The contract received a different amount than expected and stopped. Nothing was charged.",
    recovery: ["Report a problem"],
    retryable: "no",
  },
  SaleNotMature: {
    code: "SALE_NOT_MATURE",
    contexts: ["finalize"],
    ...apiErrors.SALE_NOT_MATURE,
  },
  SaleAlreadyFinalized: {
    code: "SALE_ALREADY_FINALIZED",
    contexts: ["finalize", "refund"],
    title: "Already settled",
    body: "Someone already finalized this sale.",
    recovery: ["Refresh"],
    retryable: "no",
    variants: {
      refund: { body: "Someone already finalized this sale. It can’t be refunded now." },
    },
  },
  SaleAlreadyRefunded: {
    code: "SALE_REFUNDED",
    contexts: ["finalize", "refund"],
    title: "Already refunded",
    body: required.refunded,
    recovery: ["Refresh"],
    retryable: "no",
  },
  RefundWindowClosed: {
    code: "REFUND_WINDOW_CLOSED",
    contexts: ["refund"],
    ...apiErrors.REFUND_WINDOW_CLOSED,
  },
  NothingToClaim: {
    code: "NOTHING_TO_CLAIM",
    contexts: ["claimRewards", "claimProceeds"],
    ...apiErrors.NOTHING_TO_CLAIM,
    recovery: ["Refresh"],
    variants: { claimProceeds: { body: "No settled sale proceeds to claim yet." } },
  },
  AmountExceedsAvailable: {
    code: "VALIDATION_FAILED",
    contexts: ["withdrawAvailableReward"],
    title: "That’s more than the unused budget",
    body: "You can withdraw up to {available}. Reserved and owed commissions can’t be withdrawn.",
    recovery: ["Withdraw {available}"],
    retryable: "afterFix",
  },
  CampaignActive: {
    code: "VALIDATION_FAILED",
    contexts: ["withdrawUnused"],
    title: "Pause the campaign first",
    body: "Unused budget can be withdrawn only while the campaign is paused, ended or expired. Pausing stops new sales; refunds, finalizing and claims keep working.",
    recovery: ["Pause new sales"],
    retryable: "afterFix",
  },
  ERC20InsufficientAllowance: {
    code: "PAYMENT_ALLOWANCE_INSUFFICIENT",
    contexts: ["fundCampaign", "purchase"],
    ...apiErrors.PAYMENT_ALLOWANCE_INSUFFICIENT,
  },
  ERC20InsufficientBalance: {
    code: "PAYMENT_ALLOWANCE_INSUFFICIENT",
    contexts: ["fundCampaign", "purchase"],
    shownAs: "INSUFFICIENT_SDUSD",
    ...clientErrors.INSUFFICIENT_SDUSD,
  },
  FaucetLimitExceeded: {
    code: "VALIDATION_FAILED",
    contexts: ["mintDemoTokens"],
    title: "That’s more than one request allows",
    body: "Request up to {limit} at a time.",
    recovery: ["Get {limit}"],
    retryable: "afterFix",
  },
} as const satisfies Record<string, ContractErrorCopy>;
