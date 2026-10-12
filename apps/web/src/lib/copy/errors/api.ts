import type { ErrorMessage } from "../types";
import { required } from "../required";
import { v3ApiErrors } from "./api-v3";
import { notFoundEntities } from "./not-found";

export type ErrorVariant = {
  readonly title?: string;
  readonly body?: string;
  readonly recovery?: readonly string[];
};

export type ErrorCopy = ErrorMessage & {
  readonly info?: true;
  readonly focusField?: true;
  readonly variants?: Readonly<Record<string, ErrorVariant>>;
};

const seamApiErrors = {
  UNAUTHENTICATED: {
    title: "Sign in to continue",
    body: "This needs your Spoke account.",
    recovery: ["Sign in"],
    retryable: "afterFix",
    variants: { afterSession: { title: "Your session ended" } },
  },
  INVALID_SIGNATURE: {
    title: "We couldn’t verify your sign-in",
    body: "The signature didn’t match this account, or the sign-in request expired. Sign in again.",
    recovery: ["Sign in again"],
    retryable: "afterFix",
  },
  WRONG_NETWORK: {
    title: "Wrong network",
    body: required.wrongNetwork,
    recovery: ["Switch network"],
    retryable: "afterFix",
  },
  CAMPAIGN_NOT_ACTIVE: {
    title: "This campaign isn’t open",
    body: "It isn’t live yet, has ended or is full. Existing sales still settle and pay out.",
    recovery: ["Explore campaigns"],
    retryable: "no",
  },
  CAMPAIGN_PAUSED: {
    title: "Sales are paused",
    body: required.paused,
    recovery: ["Back to campaign"],
    retryable: "no",
  },
  TOKEN_NOT_ALLOWED: {
    title: "This token isn’t supported",
    body: "Campaigns on Monad Testnet use SDUSD.",
    recovery: ["Back"],
    retryable: "no",
  },
  PRODUCT_VERSION_MISMATCH: {
    title: "This product changed",
    body: "The merchant updated this product after you opened it. Review the new details before you pay.",
    recovery: ["Review changes"],
    retryable: "afterFix",
  },
  INVALID_REFERRAL_PATH: {
    title: "This link can’t be used",
    body: "It isn’t part of this campaign or no longer resolves. Ask whoever shared it for a new one, or open the campaign directly.",
    recovery: ["Open campaign"],
    retryable: "no",
  },
  SELF_REFERRAL: {
    title: "You can’t buy through your own path",
    body: `${required.selfReferral} You can buy directly. Nobody earns a commission on this purchase.`,
    recovery: ["Buy directly", "Back to campaign"],
    retryable: "no",
  },
  DUPLICATE_CHECKOUT: {
    title: "This purchase was already placed",
    body: "We found the purchase you already sent and are showing it instead of charging you twice.",
    recovery: ["View purchase"],
    retryable: "no",
  },
  INSUFFICIENT_REWARD_ESCROW: {
    title: "Reward budget used up",
    body: required.budgetDepleted,
    recovery: [],
    retryable: "no",
    variants: {
      buyer: {
        body: `${required.budgetDepleted} You can still buy without rewards. Nobody earns a commission on this purchase.`,
        recovery: ["Buy without rewards"],
      },
      merchant: {
        body: `${required.budgetDepleted} New referred sales are refused until you add budget. Direct sales still go through.`,
        recovery: ["Add funds"],
      },
    },
  },
  PAYMENT_ALLOWANCE_INSUFFICIENT: {
    title: "Allow SDUSD first",
    body: "Spoke needs your permission to use {amount} before it can take the payment.",
    recovery: ["Allow {amount}"],
    retryable: "afterFix",
  },
  SALE_NOT_MATURE: {
    title: "Still in its hold",
    body: required.pendingHold,
    recovery: [],
    retryable: "no",
  },
  SALE_ALREADY_FINALIZED: {
    title: "Already settled",
    body: "Someone already finalized this sale. Its commission is claimable.",
    recovery: ["Refresh"],
    retryable: "no",
    info: true,
  },
  SALE_REFUNDED: {
    title: "This sale was refunded",
    body: required.refunded,
    recovery: ["Refresh"],
    retryable: "no",
  },
  NOT_AUTHORIZED_TO_REFUND: {
    title: "Only the merchant can refund this sale",
    body: "Refunds are issued by the campaign’s merchant during the hold. You can ask them for one.",
    recovery: [],
    retryable: "no",
    variants: { buyer: { recovery: ["Ask for a refund"] } },
  },
  TX_REJECTED: {
    title: "Cancelled in your wallet",
    body: "Nothing was sent and no fee was charged.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  TX_PENDING: {
    title: "Another transaction is in progress",
    body: "Wait for it to finish before starting this one.",
    recovery: ["View progress"],
    retryable: "yes",
  },
  INDEXER_LAGGING: {
    title: "Syncing",
    body: required.syncing,
    recovery: ["View status"],
    retryable: "yes",
  },
  UPSTREAM_UNAVAILABLE: {
    title: "A service Spoke depends on isn’t responding",
    body: "Monad Testnet or our indexer isn’t answering right now. Try again in a moment.",
    recovery: ["Try again", "View status"],
    retryable: "yes",
  },
  REFUND_WINDOW_CLOSED: {
    title: "The refund window has closed",
    body: "This sale’s hold ended {unlockAt}, so it can’t be refunded. It settles instead.",
    recovery: ["Refresh"],
    retryable: "no",
  },
  NOTHING_TO_CLAIM: {
    title: "Nothing to claim yet",
    body: "You have no settled earnings here. Earnings in their hold become claimable once the hold ends and the sale is finalized.",
    recovery: ["View earnings"],
    retryable: "no",
  },
  NOT_AUTHORIZED: {
    title: "You don’t have access to this",
    body: "Your account can’t do this. Check you’re signed in with the right account.",
    recovery: ["Switch account"],
    retryable: "no",
  },
  NOT_FOUND: {
    ...notFoundEntities.route,
    retryable: "no",
    variants: notFoundEntities,
  },
  VALIDATION_FAILED: {
    title: "Check the highlighted fields",
    body: "{count} fields need attention.",
    recovery: [],
    retryable: "afterFix",
    focusField: true,
  },
  INTERNAL: {
    title: "Something went wrong on our side",
    body: "Try again. If it keeps happening, report it with reference {requestId}.",
    recovery: ["Try again", "Report a problem"],
    retryable: "yes",
  },
} as const satisfies Record<string, ErrorCopy>;

export const apiErrors = { ...seamApiErrors, ...v3ApiErrors } as const satisfies Record<
  string,
  ErrorCopy
>;

export type ApiErrorKey = keyof typeof apiErrors;
