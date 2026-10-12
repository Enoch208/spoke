import {
  contractErrorCodes,
  demoTokenAbi,
  isContractErrorName,
  spokeProtocolAbi,
} from "@spoke/protocol";
import {
  BaseError,
  ChainMismatchError,
  decodeErrorResult,
  HttpRequestError,
  InsufficientFundsError,
  isHex,
  LimitExceededRpcError,
  TimeoutError,
  UserRejectedRequestError,
} from "viem";
import type { ClientErrorCode } from "@/lib/client/errors";
import type { Hex, TxError, TxErrorPhase } from "./types";

export const outOfGas = "OutOfGas";

export class SignerRejectedError extends Error {
  override readonly name = "SignerRejectedError";
}

export class SignerUnavailableError extends Error {
  override readonly name = "SignerUnavailableError";
}

export const alreadyDoneErrors = new Set([
  "DuplicateCheckout",
  "OrderAlreadyUsed",
  "SaleAlreadyFinalized",
  "NothingToClaim",
]);

const retryableCodes = new Set<ClientErrorCode>([
  "RPC_UNAVAILABLE",
  "PAYMENT_ALLOWANCE_INSUFFICIENT",
  "INSUFFICIENT_MON",
  "INSUFFICIENT_SDUSD",
  "RATE_LIMITED",
  "TX_REJECTED",
]);

const abis = [spokeProtocolAbi, demoTokenAbi] as const;

export const decodeRevertName = (data: Hex): string | null => {
  for (const abi of abis) {
    try {
      return decodeErrorResult({ abi, data }).errorName;
    } catch {
      continue;
    }
  }
  return null;
};

const hasHexData = (value: unknown): value is { data: Hex } =>
  typeof value === "object" &&
  value !== null &&
  "data" in value &&
  typeof value.data === "string" &&
  isHex(value.data) &&
  value.data.length >= 10;

export const findRevertData = (error: unknown): Hex | null => {
  let current: unknown = error;
  for (let depth = 0; depth < 12 && current; depth += 1) {
    if (hasHexData(current)) return current.data;
    current = current instanceof Error ? current.cause : null;
  }
  return null;
};

const chainHas = (error: unknown, match: (candidate: unknown) => boolean) => {
  if (error instanceof BaseError) return error.walk(match) !== null;
  return match(error);
};

export const contractErrorCode = (name: string): ClientErrorCode => {
  if (name === "ERC20InsufficientBalance") return "INSUFFICIENT_SDUSD";
  if (name === outOfGas) return "INTERNAL";
  return isContractErrorName(name) ? contractErrorCodes[name] : "INTERNAL";
};

export const txError = (
  code: ClientErrorCode,
  phase: TxErrorPhase,
  extra: Partial<Pick<TxError, "contractError" | "message" | "feePaidWei" | "retryable">> = {},
): TxError => ({
  code,
  phase,
  contractError: extra.contractError ?? null,
  message: extra.message ?? code,
  feePaidWei: extra.feePaidWei ?? null,
  retryable:
    extra.retryable ??
    (retryableCodes.has(code) || phase === "never_included" || extra.contractError === outOfGas),
});

export const revertError = (
  name: string | null,
  phase: "preflight" | "mined",
  feePaidWei: string | null = null,
): TxError =>
  txError(name ? contractErrorCode(name) : "INTERNAL", phase, {
    contractError: name,
    feePaidWei,
    message: name ?? "Reverted without a readable reason",
  });

export const classifySendError = (error: unknown, phase: "preflight" | "wallet"): TxError => {
  if (
    error instanceof SignerRejectedError ||
    chainHas(error, (e) => e instanceof UserRejectedRequestError)
  ) {
    return txError("TX_REJECTED", "wallet", { retryable: true });
  }
  if (chainHas(error, (e) => e instanceof ChainMismatchError))
    return txError("WRONG_NETWORK", phase);
  if (chainHas(error, (e) => e instanceof InsufficientFundsError)) {
    return txError("INSUFFICIENT_MON", phase);
  }
  if (chainHas(error, (e) => e instanceof LimitExceededRpcError))
    return txError("RATE_LIMITED", phase);
  if (chainHas(error, (e) => e instanceof HttpRequestError || e instanceof TimeoutError)) {
    return txError("RPC_UNAVAILABLE", phase);
  }
  if (error instanceof SignerUnavailableError) return txError("UNAUTHENTICATED", phase);
  const data = findRevertData(error);
  if (data) return revertError(decodeRevertName(data), "preflight");
  return txError("INTERNAL", phase, {
    message: error instanceof Error ? error.message : "Unknown wallet error",
  });
};
