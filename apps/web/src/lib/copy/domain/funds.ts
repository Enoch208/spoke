import type { gasStates } from "@spoke/protocol";

export const gasStateLines = {
  eligible: "Get a little testnet MON for network fees. Free, and limited per account and device.",
  sending: "Sending {amount} MON… It usually arrives within a few seconds.",
  received: "{amount} MON arrived. You’re set for network fees.",
  already_received:
    "You’ve already received test MON. Next request {nextRequestAt}, or use the Monad faucet.",
  balance_sufficient: "You have enough testnet MON for network fees.",
  device_limit:
    "This device already received test MON today. Try again {nextRequestAt}, or use the Monad faucet.",
  station_empty: "The gas station is out of test MON right now. Use the Monad faucet instead.",
  wallet_account:
    "The gas station tops up new passkey accounts. For a wallet, use the Monad faucet.",
  failed: "Couldn’t send test MON. Try again, or use the Monad faucet.",
  unavailable: "The gas drip isn’t available right now. Use the Monad faucet instead.",
  not_configured: "The gas drip isn’t set up on this network. Use the Monad faucet.",
} as const satisfies Record<(typeof gasStates)[number], string>;

export type GasStateKey = keyof typeof gasStateLines;

export const faucetLines = {
  available: "Mint up to {limit} per request. SDUSD is a testnet demo token with no cash value.",
  minted: "{amount} added to your account.",
} as const;
