import { common } from "../common";
import { required } from "../required";
import type { GlobalStateCopy } from "./shape";

export const systemStates = {
  pendingTransaction: {
    actions: ["View progress"],
    chip: "Confirming",
    pill: "{count} in progress",
  },
  unknownOutcome: {
    title: "We can’t confirm this yet",
    body: `${required.unverified} Don’t send it again until this resolves.`,
    actions: ["Check again", "View on explorer"],
    chip: "Unconfirmed",
  },
  indexerSyncing: {
    title: "Syncing",
    body: required.syncing,
    actions: ["View status"],
    chip: "Syncing",
    asOf: "as of block {block}",
  },
  rpcUnavailable: {
    title: "We can’t reach Monad Testnet",
    body: "Showing the last data we loaded. Onchain actions are paused here until the connection returns. Your funds stay in the Spoke contract.",
    actions: ["Try again", "View status"],
    tooltip: "Waiting for Monad Testnet",
  },
  apiUnavailable: {
    title: "We can’t reach Spoke right now",
    body: "Lists, profiles and history may be missing or out of date. Balances and payouts are recorded onchain and are not affected.",
    actions: ["Try again", "View status"],
  },
  featureNotLive: {
    title: "{featureName} isn’t live yet",
    body: "{featureSentence} You can try it now with sample data in demo mode.",
    actions: ["Try it in demo mode", "See what’s live"],
    chip: "Demo only",
  },
  protocolNotDeployed: {
    title: "Spoke isn’t deployed on Monad Testnet yet",
    body: "Campaigns, checkout and payouts need Spoke’s contracts, which aren’t on this network yet. You can try every flow with sample data in demo mode.",
    actions: ["Explore the demo"],
  },
  demoMode: {
    actions: ["Switch persona", "Reset demo", "Exit demo"],
    badge: "Demo",
    sampleLabel: "Sample",
    proofLine: common.simulated,
  },
  offline: {
    title: "You’re offline",
    body: "Showing what was loaded before. Actions come back when you reconnect.",
    tooltip: "You’re offline",
  },
  offlineNotCached: {
    title: "You are offline",
    body: "This page isn’t saved on this device yet. Reconnect to open it.",
    actions: ["Try again"],
  },
  maintenance: {
    title: "Planned maintenance",
    body: "Spoke is being updated until about {endTime}. Your funds stay in the Spoke contract on Monad Testnet, and nothing you’ve earned changes during maintenance.",
    actions: ["View status"],
    tooltip: "Paused for planned maintenance until {endTime}",
  },
  testnet: { amountSuffix: "· testnet" },
} as const satisfies Record<string, GlobalStateCopy>;
