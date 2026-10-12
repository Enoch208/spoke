import { isContractErrorName } from "@spoke/protocol";
import { isApiErrorCode } from "@/lib/client/errors";
import {
  apiErrorCopy,
  clientErrors,
  contractErrorCopy,
  errorFallbacks,
  outOfGas as outOfGasCopy,
  type ResolvedError,
} from "@/lib/copy";
import { outOfGas } from "./errors";
import type { TxError } from "./types";

export type TxErrorText = { title: string | null; body: string; recovery: readonly string[] };

const fromResolved = (resolved: ResolvedError): TxErrorText =>
  resolved.kind === "line"
    ? { title: null, body: resolved.copy.line, recovery: resolved.copy.recovery }
    : { title: resolved.copy.title, body: resolved.copy.body, recovery: resolved.copy.recovery };

const isClientCode = (code: string): code is keyof typeof clientErrors =>
  Object.hasOwn(clientErrors, code);

export const txErrorText = (error: TxError): TxErrorText => {
  if (error.contractError === outOfGas) {
    return { title: null, body: outOfGasCopy.body, recovery: outOfGasCopy.recovery };
  }
  if (error.contractError && isContractErrorName(error.contractError)) {
    return fromResolved(contractErrorCopy(error.contractError));
  }
  if (error.code === "INTERNAL" && (error.phase === "mined" || error.phase === "preflight")) {
    const fallback = errorFallbacks.undecodableRevert;
    return { title: fallback.title, body: fallback.body, recovery: fallback.recovery };
  }
  if (isClientCode(error.code)) {
    const copy = clientErrors[error.code];
    return { title: copy.title, body: copy.body, recovery: copy.recovery };
  }
  if (isApiErrorCode(error.code)) return fromResolved(apiErrorCopy(error.code));
  const fallback = errorFallbacks.unknownApiCode;
  return { title: fallback.title, body: fallback.body, recovery: fallback.recovery };
};
