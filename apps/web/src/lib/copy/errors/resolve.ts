import { contractErrorCodes, type ContractErrorName, type ErrorCode } from "@spoke/protocol";
import { apiErrors, type ErrorCopy } from "./api";
import { apiErrorLines, type ErrorLine } from "./api-v3";
import { clientErrors } from "./client";
import { contractErrors } from "./contract";
import { errorFallbacks } from "./fallbacks";

export type ResolvedError =
  | { kind: "message"; copy: ErrorCopy }
  | { kind: "line"; copy: ErrorLine }
  | { kind: "fallback"; copy: ErrorCopy };

const hasKey = <Record extends object>(record: Record, key: PropertyKey): key is keyof Record =>
  Object.hasOwn(record, key);

const clientCopyForApiCode = {
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_LIVE",
} as const;

export const apiErrorCopy = (code: ErrorCode): ResolvedError => {
  if (hasKey(apiErrors, code)) return { kind: "message", copy: apiErrors[code] };
  if (hasKey(clientErrors, code)) return { kind: "message", copy: clientErrors[code] };
  if (hasKey(clientCopyForApiCode, code)) {
    return { kind: "message", copy: clientErrors[clientCopyForApiCode[code]] };
  }
  if (hasKey(apiErrorLines, code)) return { kind: "line", copy: apiErrorLines[code] };
  return { kind: "fallback", copy: errorFallbacks.unknownApiCode };
};

export const contractErrorCopy = (name: ContractErrorName): ResolvedError =>
  hasKey(contractErrors, name)
    ? { kind: "message", copy: contractErrors[name] }
    : apiErrorCopy(contractErrorCodes[name]);
