import { required } from "../required";
import type { ApiErrorKey, ErrorCopy } from "./api";

export type ErrorLine = {
  readonly line: string;
  readonly recovery: readonly string[];
};

export const v3ApiErrors = {
  NANSEN_UNAVAILABLE: {
    title: "Wallet insights are unavailable",
    body: "Cached insights could not be loaded. Settled sales and rewards are unaffected.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  CAMPAIGN_NOT_FUNDED: {
    title: "Not funded yet",
    body: required.notFunded,
    recovery: ["Explore campaigns"],
    retryable: "no",
    variants: { merchant: { recovery: ["Add funds"] } },
  },
  POLICY_MISMATCH: {
    title: "The campaign terms changed",
    body: "The terms you reviewed don’t match the campaign’s current policy. Review them before you continue.",
    recovery: ["Review terms"],
    retryable: "afterFix",
  },
  NOT_ELIGIBLE: {
    title: "You’re not eligible for this campaign",
    body: "This campaign is limited to invited distributors, or to buyers who meet its terms.",
    recovery: ["View terms"],
    retryable: "no",
  },
  REAUTH_REQUIRED: {
    title: "Confirm it’s you",
    body: "This change needs a fresh confirmation with your passkey or wallet. Nothing has changed yet.",
    recovery: ["Confirm"],
    retryable: "afterFix",
  },
  CHECKOUT_PAYMENT_FAILED: {
    title: "Payment didn’t go through",
    body: "No SDUSD left your account. Check your balance and try again.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  ATTESTATION_UNTRUSTED: {
    title: "This order couldn’t be verified",
    body: "The signer for this merchant-attested order isn’t authorised or was revoked, so it can’t earn rewards.",
    recovery: [],
    retryable: "no",
    variants: { merchant: { recovery: ["View signers"] } },
  },
  SOURCE_REFUND_UNRESOLVED: {
    title: "Waiting on the store’s refund status",
    body: "The store hasn’t confirmed whether this order was refunded. Its rewards stay on hold until it does.",
    recovery: [],
    retryable: "yes",
  },
} as const satisfies Record<string, ErrorCopy>;

export const apiErrorAliases = {
  ORDER_ALREADY_USED: "DUPLICATE_CHECKOUT",
  REFERRAL_SELF_DEAL: "SELF_REFERRAL",
  CLAIM_NOT_AVAILABLE: "NOTHING_TO_CLAIM",
  INDEXER_BEHIND: "INDEXER_LAGGING",
} as const satisfies Record<string, ApiErrorKey>;

export const apiErrorLines = {
  CONFLICT: {
    line: "This case changed since you opened it. Review the latest before acting.",
    recovery: ["Reload case"],
  },
  HANDLE_TAKEN: {
    line: "Someone just took @{handle}. Try one of these:",
    recovery: [],
  },
  HANDLE_RESERVED: {
    line: "That handle is reserved.",
    recovery: [],
  },
  HANDLE_CHANGE_TOO_SOON: {
    line: "You changed your handle on {date}. You can change it again on {handleChangeAvailableAt}.",
    recovery: [],
  },
  GAS_ALREADY_RECEIVED: {
    line: "You’ve already received test MON. Next request {nextRequestAt}, or use the Monad faucet.",
    recovery: ["Open Monad faucet"],
  },
  GAS_STATION_EMPTY: {
    line: "The gas station is out of test MON right now. Use the Monad faucet instead.",
    recovery: ["Open Monad faucet", "Try again"],
  },
  WALLET_ALREADY_LINKED: {
    line: "This wallet belongs to another Spoke account. Sign in with it and unlink it there, or delete that account first.",
    recovery: [],
  },
  ACCOUNT_HAS_ACTIVE_CAMPAIGNS: {
    line: "You run {n} campaigns that are live or paused. End them before deleting your account.",
    recovery: ["Go to campaigns"],
  },
  SLUG_TAKEN: {
    line: "That address is taken. Try another.",
    recovery: [],
  },
  BUSINESS_NOT_CLOSABLE: {
    line: "Finish the steps above first.",
    recovery: [],
  },
  EXPORT_RECONCILIATION_MISMATCH: {
    line: "These numbers don’t match the chain at block {n}. Spoke’s operators have been alerted. Exports are paused until it’s fixed.",
    recovery: [],
  },
  TEAM_ALREADY_MEMBER: {
    line: "{handle} is already on your team.",
    recovery: [],
  },
  WEBHOOK_URL_NOT_ALLOWED: {
    line: "Use a public HTTPS address. Private and local addresses aren’t allowed.",
    recovery: [],
  },
} as const satisfies Record<string, ErrorLine>;
