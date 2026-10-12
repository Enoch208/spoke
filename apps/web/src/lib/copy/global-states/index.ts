import { accessStates } from "./access";
import { readStates } from "./reads";
import type { GlobalStateCopy } from "./shape";
import { systemStates } from "./system";

export { signedOutActionPhrases, signedOutThings } from "./access";
export type { GlobalStateCopy } from "./shape";

export const globalStates = {
  ...readStates,
  ...accessStates,
  ...systemStates,
} as const satisfies Record<string, GlobalStateCopy>;

export const globalStateIds = {
  "GS-01": "loading",
  "GS-02": "refreshing",
  "GS-03": "stale",
  "GS-04": "emptyFirstUse",
  "GS-05": "emptyFiltered",
  "GS-06": "errorRetryable",
  "GS-07": "errorFatal",
  "GS-08": "signedOut",
  "GS-08a": "signedOutAction",
  "GS-09": "sessionExpired",
  "GS-10": "walletDisconnected",
  "GS-11": "wrongNetwork",
  "GS-12": "insufficientMon",
  "GS-13": "insufficientSdusd",
  "GS-14": "pendingTransaction",
  "GS-15": "unknownOutcome",
  "GS-16": "indexerSyncing",
  "GS-17": "rpcUnavailable",
  "GS-18": "apiUnavailable",
  "GS-19": "rateLimited",
  "GS-20": "notFound",
  "GS-21": "unauthorised",
  "GS-22": "sellingNotSetUp",
  "GS-23": "featureNotLive",
  "GS-24": "protocolNotDeployed",
  "GS-25": "demoMode",
  "GS-26": "offline",
  "GS-26a": "offlineNotCached",
  "GS-27": "maintenance",
  "GS-28": "passkeyUnsupported",
  "GS-29": "recoveryNotBackedUp",
  "GS-30": "testnet",
} as const satisfies Record<string, keyof typeof globalStates>;
