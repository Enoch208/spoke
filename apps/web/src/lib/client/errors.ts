import { errorCodes, type ClientMethod, type ErrorCode } from "@spoke/protocol";

export const clientOnlyErrorCodes = [
  "OFFLINE",
  "API_UNREACHABLE",
  "RPC_UNAVAILABLE",
  "TIMEOUT",
  "RESPONSE_INVALID",
  "PROTOCOL_NOT_DEPLOYED",
  "FEATURE_NOT_LIVE",
  "INSUFFICIENT_MON",
  "INSUFFICIENT_SDUSD",
  "TX_UNKNOWN",
  "TX_REPLACED",
] as const;
export type ClientOnlyErrorCode = (typeof clientOnlyErrorCodes)[number];

export type ClientErrorCode = ErrorCode | ClientOnlyErrorCode;

const retryableClientCodes = new Set<ClientErrorCode>([
  "OFFLINE",
  "API_UNREACHABLE",
  "RPC_UNAVAILABLE",
  "RATE_LIMITED",
  "TIMEOUT",
  "TX_UNKNOWN",
]);

export type ClientErrorInit = {
  code: ClientErrorCode;
  message: string;
  retryable?: boolean;
  requestId?: string | null;
  status?: number | null;
  details?: Readonly<Record<string, unknown>> | null;
  method?: ClientMethod;
  retryAfterSeconds?: number | null;
};

export class ClientError extends Error {
  override readonly name = "ClientError";
  readonly code: ClientErrorCode;
  readonly retryable: boolean;
  readonly requestId: string | null;
  readonly status: number | null;
  readonly details: Readonly<Record<string, unknown>> | null;
  readonly method: ClientMethod | null;
  readonly retryAfterSeconds: number | null;

  constructor(init: ClientErrorInit) {
    super(init.message);
    this.code = init.code;
    this.retryable = init.retryable ?? retryableClientCodes.has(init.code);
    this.requestId = init.requestId ?? null;
    this.status = init.status ?? null;
    this.details = init.details ?? null;
    this.method = init.method ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
  }
}

export const isClientError = (error: unknown): error is ClientError => error instanceof ClientError;

const knownCodes = new Set<string>(errorCodes);

export const isApiErrorCode = (code: string): code is ErrorCode => knownCodes.has(code);

export const errorCodeOf = (error: unknown): ClientErrorCode =>
  isClientError(error) ? error.code : "INTERNAL";

export const shouldRetry = (failureCount: number, error: unknown) => {
  if (failureCount >= 2) return false;
  if (!isClientError(error)) return false;
  if (error.status !== null && error.status >= 400 && error.status < 500) return false;
  return error.retryable;
};

export const retryDelay = (attempt: number, error: unknown) => {
  if (isClientError(error) && error.retryAfterSeconds !== null) {
    return error.retryAfterSeconds * 1000;
  }
  return Math.min(1000 * 2 ** attempt, 8000);
};
