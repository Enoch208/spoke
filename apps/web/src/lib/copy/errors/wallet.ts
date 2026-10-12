import { apiErrors, type ApiErrorKey, type ErrorCopy } from "./api";
import { clientErrors, type ClientErrorCode } from "./client";

export type WalletErrorCopy = ErrorCopy & {
  readonly mapsTo?: ApiErrorKey | ClientErrorCode | "GS-10";
};

export type WalletRejectionContext = "transaction" | "connect" | "signIn";

const wrongNetwork = { mapsTo: "WRONG_NETWORK", ...apiErrors.WRONG_NETWORK } as const;

const feeTooLow = {
  title: "The network fee was set too low",
  body: "Try again and Spoke will estimate the fee again.",
  recovery: ["Try again"],
  retryable: "yes",
} as const;

const disconnected = {
  mapsTo: "GS-10",
  title: "Your wallet disconnected",
  body: "Reconnect it to continue.",
  recovery: ["Reconnect wallet"],
  retryable: "afterFix",
} as const;

const noWallet = {
  title: "No wallet found in this browser",
  body: "Install a wallet extension, scan with a phone wallet through WalletConnect, or continue with a passkey.",
  recovery: ["Continue with passkey", "Use WalletConnect"],
  retryable: "afterFix",
} as const;

const sendUnreachable = {
  mapsTo: "RPC_UNAVAILABLE",
  title: "We couldn’t reach Monad Testnet",
  body: "Your transaction may not have been sent. Check your wallet’s activity before trying again.",
  recovery: ["Check again"],
  retryable: "yes",
} as const;

const receiptUnknown = { mapsTo: "TX_UNKNOWN", ...clientErrors.TX_UNKNOWN } as const;

export const walletErrors = {
  UserRejectedRequestError: {
    transaction: { mapsTo: "TX_REJECTED", ...apiErrors.TX_REJECTED },
    connect: {
      title: "Connection cancelled",
      body: "You closed the wallet request. Connect again when you’re ready.",
      recovery: ["Connect wallet"],
      retryable: "yes",
    },
    signIn: {
      title: "Sign-in cancelled",
      body: "Signing proves you own this wallet. It’s free and doesn’t send a transaction.",
      recovery: ["Sign in"],
      retryable: "yes",
    },
  },
  ChainMismatchError: wrongNetwork,
  ConnectorChainMismatchError: wrongNetwork,
  SwitchChainError: {
    title: "Add Monad Testnet to your wallet",
    body: "Your wallet doesn’t have Monad Testnet yet. Approve adding it, then switch.",
    recovery: ["Add network"],
    retryable: "afterFix",
  },
  SwitchChainNotSupportedError: {
    title: "Switch networks in your wallet",
    body: "Your wallet can’t switch automatically. Open it and choose Monad Testnet (chain ID 10143).",
    recovery: ["I’ve switched"],
    retryable: "afterFix",
  },
  InsufficientFundsError: { mapsTo: "INSUFFICIENT_MON", ...clientErrors.INSUFFICIENT_MON },
  NonceTooLowError: {
    title: "Another transaction went first",
    body: "A transaction from this account was sent before this one. Try again.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  NonceTooHighError: {
    title: "Your wallet is ahead of the network",
    body: "An earlier transaction from this account may be stuck. Wait for it or clear your wallet’s pending activity, then try again.",
    recovery: ["Try again"],
    retryable: "afterFix",
  },
  NonceMaxValueError: {
    title: "This account can’t send transactions",
    body: "Your wallet reported an invalid transaction count. Use another account.",
    recovery: ["Switch account"],
    retryable: "no",
  },
  FeeCapTooLowError: feeTooLow,
  IntrinsicGasTooLowError: feeTooLow,
  TransactionRejectedRpcError: {
    title: "The network refused this transaction",
    body: "It wasn’t sent. Try again; if it repeats, check your MON balance.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  ResourceUnavailableRpcError: {
    title: "Your wallet already has a request open",
    body: "Open your wallet, finish or close the earlier request, then try again.",
    recovery: ["Try again"],
    retryable: "afterFix",
  },
  UnauthorizedProviderError: {
    title: "Your wallet hasn’t allowed Spoke yet",
    body: "Approve the connection in your wallet, then try again.",
    recovery: ["Connect wallet"],
    retryable: "afterFix",
  },
  UnsupportedProviderMethodError: {
    title: "Your wallet can’t do this",
    body: "This wallet doesn’t support the request. Try another wallet or a passkey account.",
    recovery: ["Use another wallet"],
    retryable: "no",
  },
  ConnectorNotConnectedError: disconnected,
  ConnectorAccountNotFoundError: disconnected,
  ProviderDisconnectedError: disconnected,
  ConnectorNotFoundError: noWallet,
  ProviderNotFoundError: noWallet,
  ChainDisconnectedError: { mapsTo: "RPC_UNAVAILABLE", ...clientErrors.RPC_UNAVAILABLE },
  HttpRequestError: sendUnreachable,
  TimeoutError: sendUnreachable,
  WaitForTransactionReceiptTimeoutError: receiptUnknown,
  TransactionReceiptNotFoundError: receiptUnknown,
} as const satisfies Record<
  string,
  WalletErrorCopy | Readonly<Record<WalletRejectionContext, WalletErrorCopy>>
>;

export type WalletErrorName = keyof typeof walletErrors;

export const silentWalletErrors = ["ConnectorAlreadyConnectedError"] as const;

export const revertWalletErrors = [
  "ContractFunctionRevertedError",
  "ExecutionRevertedError",
  "EstimateGasExecutionError",
  "CallExecutionError",
] as const;
