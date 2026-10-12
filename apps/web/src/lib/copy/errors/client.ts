import { required } from "../required";
import type { ErrorCopy } from "./api";

export const clientErrorCodes = [
  "OFFLINE",
  "API_UNREACHABLE",
  "RPC_UNAVAILABLE",
  "RATE_LIMITED",
  "TIMEOUT",
  "RESPONSE_INVALID",
  "PROTOCOL_NOT_DEPLOYED",
  "FEATURE_NOT_LIVE",
  "INSUFFICIENT_MON",
  "INSUFFICIENT_SDUSD",
  "TX_UNKNOWN",
  "TX_REPLACED",
] as const;

export type ClientErrorCode = (typeof clientErrorCodes)[number];

export const clientErrors = {
  OFFLINE: {
    title: "You’re offline",
    body: "Reconnect to continue. Nothing was sent.",
    recovery: [],
    retryable: "yes",
  },
  API_UNREACHABLE: {
    title: "We can’t reach Spoke right now",
    body: "Lists, profiles and history may be missing or out of date. Balances and payouts are recorded onchain and are not affected.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  RPC_UNAVAILABLE: {
    title: "We can’t reach Monad Testnet",
    body: "Showing the last data we loaded. Onchain actions are paused here until the connection returns. Your funds stay in the Spoke contract.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  RATE_LIMITED: {
    title: "Too many requests",
    body: "Wait a moment and try again.",
    recovery: ["Try again"],
    retryable: "yes",
    variants: {
      withWait: { body: "Wait {seconds} s and try again." },
      invitations: { body: "You’ve sent 20 invitations today. You can send more tomorrow." },
      reports: {
        body: "You’ve sent several reports in a short time. Try again in a few minutes.",
      },
      signIn: { body: "Too many sign-in attempts. Try again in a minute." },
    },
  },
  TIMEOUT: {
    title: "This is taking too long",
    body: "The request timed out. Try again.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  RESPONSE_INVALID: {
    title: "We got an answer we couldn’t read",
    body: "Spoke’s server sent data this page doesn’t understand. Reload; if it continues, report it.",
    recovery: ["Reload page", "Report a problem"],
    retryable: "no",
  },
  PROTOCOL_NOT_DEPLOYED: {
    title: "Spoke isn’t deployed on Monad Testnet yet",
    body: "Campaigns, checkout and payouts need Spoke’s contracts, which aren’t on this network yet. You can try every flow with sample data in demo mode.",
    recovery: ["Explore the demo"],
    retryable: "no",
  },
  FEATURE_NOT_LIVE: {
    title: "{featureName} isn’t live yet",
    body: "{featureSentence} You can try it now with sample data in demo mode.",
    recovery: ["Try it in demo mode"],
    retryable: "no",
  },
  INSUFFICIENT_MON: {
    title: "You need a little testnet MON",
    body: "Every onchain action pays a small network fee in testnet MON. You have {monBalance}; this needs about {fee}.",
    recovery: ["Get test MON"],
    retryable: "afterFix",
  },
  INSUFFICIENT_SDUSD: {
    title: "Not enough SDUSD",
    body: "This needs {required} and you have {balance}. SDUSD is a free testnet demo token.",
    recovery: ["Get test SDUSD"],
    retryable: "afterFix",
  },
  TX_UNKNOWN: {
    title: "We can’t confirm this yet",
    body: `${required.unverified} Don’t send it again until this resolves.`,
    recovery: ["Check again"],
    retryable: "yes",
  },
  TX_REPLACED: {
    title: "Replaced in your wallet",
    body: "Another transaction from your wallet took this one’s place. We’re checking whether {actionName} still happened.",
    recovery: ["Check again"],
    retryable: "yes",
    variants: {
      cancelled: {
        title: "Cancelled in your wallet",
        body: "Your wallet cancelled this transaction. Nothing changed.",
        recovery: ["Try again"],
      },
    },
  },
} as const satisfies Record<ClientErrorCode, ErrorCopy>;
