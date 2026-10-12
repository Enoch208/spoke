import type { TxActionCopy, TxOffchainActionCopy } from "./actions-shape";

const mintDemoTokens = {
  name: "Get test SDUSD",
  label: "Get {amount}",
  steps: ["Get {amount}"],
  idle: "Get {amount}",
  beforeConfirm: ["Free, testnet only, up to {limit} per request."],
  disclosure: { id: "D-01", short: "SDUSD · testnet demo token, no cash value" },
  progress: "Minting…",
  success: {
    title: "{amount} added",
    body: "SDUSD is a testnet demo token with no cash value.",
    actions: [],
  },
  toast: { text: "{amount} added" },
  failures: ["FaucetLimitExceeded", "INSUFFICIENT_MON"],
  summary: ["Token SDUSD (testnet demo token)", "To {address} (this account)"],
} as const satisfies TxActionCopy;

const requestGas = {
  name: "Get test MON",
  idle: "Get test MON",
  working: "Sending test MON…",
  success: "{amount} MON arrived for network fees",
  successToast: "T-30",
  alreadyReceived:
    "You’ve already received test MON. Next request {nextRequestAt}, or use the Monad faucet.",
  unavailable: "The gas drip isn’t available right now. Use the Monad faucet instead.",
} as const satisfies TxOffchainActionCopy;

export const testnetTxActions = { mintDemoTokens, requestGas } as const;
