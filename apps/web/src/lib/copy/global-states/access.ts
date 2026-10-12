import { required } from "../required";
import type { GlobalStateCopy } from "./shape";

export const signedOutThings = [
  "earnings",
  "links",
  "sales",
  "purchases",
  "campaigns",
  "wallet",
  "notifications",
  "settings",
] as const satisfies readonly string[];

export const signedOutActionPhrases = [
  "create your link",
  "buy this",
  "claim your earnings",
  "launch a campaign",
] as const satisfies readonly string[];

export const accessStates = {
  signedOut: {
    title: "Sign in to see your {thing}",
    body: "Use a passkey or a wallet. If you’re new, the same button creates your account.",
    actions: ["Continue with passkey", "Use a wallet"],
  },
  signedOutAction: {
    title: "Sign in to Spoke",
    body: "Sign in to {actionPhrase}. You’ll come back to this page.",
    actions: ["Continue with passkey", "Use a wallet"],
  },
  sessionExpired: {
    title: "Your session ended",
    body: "Sign in again to continue. Transactions you already sent keep going, and this page stays as it was.",
    actions: ["Sign in again", "Sign out"],
  },
  walletDisconnected: {
    body: "Your wallet disconnected. Reconnect it to continue.",
    actions: ["Reconnect wallet"],
  },
  wrongNetwork: {
    title: "Wrong network",
    body: required.wrongNetwork,
    actions: ["Switch network"],
    tooltip: required.wrongNetwork,
  },
  insufficientMon: {
    title: "You need a little testnet MON",
    body: "Every onchain action pays a small network fee in testnet MON. You have {monBalance}; this needs about {fee}.",
    actions: ["Get test MON", "Use the Monad faucet"],
  },
  insufficientSdusd: {
    title: "Not enough SDUSD",
    body: "This needs {required} and you have {balance}. SDUSD is a free testnet demo token.",
    actions: ["Get test SDUSD"],
  },
  sellingNotSetUp: {
    title: "Set up selling first",
    body: "Add your business name and the account that receives sale proceeds. You can change both later.",
  },
  passkeyUnsupported: {
    title: "This browser can’t use passkeys",
    body: "Passkeys need a current browser on a device with a screen lock. You can sign in with a wallet instead.",
    actions: ["Use a wallet", "Help with passkeys"],
  },
  recoveryNotBackedUp: {},
} as const satisfies Record<string, GlobalStateCopy>;
