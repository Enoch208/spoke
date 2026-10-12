import {
  clientMethodSchemas,
  envelope,
  type ClientInput,
  type ClientMethod,
  type ClientOutput,
} from "@spoke/protocol";
import { ClientError, isApiErrorCode } from "../errors";
import type { IndexingStatus, ResponseMeta } from "../types";
import { routeFor, type LiveRoute } from "./routes";

export type HttpConfig = {
  apiBase: string;
  csrfToken: () => string | null;
  onMeta?: (meta: ResponseMeta) => void;
  onUnauthenticated?: (method: ClientMethod) => void;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  isOnline?: () => boolean;
};

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const queryValue = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map(String).join(",");
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  return JSON.stringify(value);
};

export type BuiltRequest = { url: string; init: RequestInit };

export const buildRequest = (
  route: LiveRoute,
  fields: Fields,
  config: Pick<HttpConfig, "apiBase" | "csrfToken">,
): BuiltRequest => {
  const pathNames = new Set([...route.path.matchAll(/:(\w+)/g)].map((match) => match[1]));
  const rest: Fields = Object.fromEntries(
    Object.entries(fields).filter(([name]) => !pathNames.has(name)),
  );
  const path = route.path.replace(/:(\w+)/g, (_, name: string) =>
    encodeURIComponent(queryValue(fields[name]) ?? ""),
  );
  const url = new URL(`${config.apiBase}${path}`);
  const headers = new Headers({ accept: "application/json" });
  const init: RequestInit = {
    method: route.verb,
    headers,
    credentials: "include",
  };
  if (route.verb === "GET") {
    for (const [key, value] of Object.entries(rest)) {
      const serialized = queryValue(value);
      if (serialized !== null) url.searchParams.set(key, serialized);
    }
    return { url: url.toString(), init };
  }
  const csrf = config.csrfToken();
  if (csrf) headers.set("x-csrf-token", csrf);
  if (route.idempotencyField) {
    const key = queryValue(rest[route.idempotencyField]);
    if (key) headers.set("idempotency-key", key);
  }
  if (route.multipart) {
    const form = new FormData();
    for (const [key, value] of Object.entries(rest)) {
      if (value instanceof Blob) form.set(key, value);
      else {
        const serialized = queryValue(value);
        if (serialized !== null) form.set(key, serialized);
      }
    }
    init.body = form;
    return { url: url.toString(), init };
  }
  const body = route.payload ? rest[route.payload] : rest;
  if (route.verb !== "DELETE" || (isFields(body) && Object.keys(body).length > 0)) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(body ?? {});
  }
  return { url: url.toString(), init };
};

const isIndexingStatus = (value: unknown): value is IndexingStatus =>
  value === "live" || value === "syncing" || value === "behind";

const readMeta = (method: ClientMethod, json: unknown): ResponseMeta => {
  const fields = isFields(json) ? json : {};
  const block = fields.blockNumber;
  return {
    method,
    requestId: typeof fields.requestId === "string" ? fields.requestId : null,
    indexingStatus: isIndexingStatus(fields.indexingStatus) ? fields.indexingStatus : null,
    blockNumber: typeof block === "string" ? block : null,
  };
};

const retryAfterOf = (response: Response, details: Fields | null) => {
  const fromDetails = details?.retryAfterSeconds;
  if (typeof fromDetails === "number") return fromDetails;
  const header = Number(response.headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? header : null;
};

const failureFrom = (method: ClientMethod, response: Response, json: unknown): ClientError => {
  const error = isFields(json) && isFields(json.error) ? json.error : null;
  const rawCode = typeof error?.code === "string" ? error.code : null;
  const details = error && isFields(error.details) ? error.details : null;
  const requestId =
    (typeof error?.requestId === "string" ? error.requestId : null) ??
    response.headers.get("x-request-id");
  const base = {
    method,
    status: response.status,
    requestId,
    details,
    retryAfterSeconds: retryAfterOf(response, details),
    message: typeof error?.message === "string" ? error.message : response.statusText,
  };
  if (rawCode && isApiErrorCode(rawCode)) {
    return new ClientError({
      ...base,
      code: rawCode,
      ...(typeof error?.retryable === "boolean" ? { retryable: error.retryable } : {}),
    });
  }
  if (response.status === 429) return new ClientError({ ...base, code: "RATE_LIMITED" });
  if (response.status >= 500) return new ClientError({ ...base, code: "API_UNREACHABLE" });
  return new ClientError({ ...base, code: rawCode ? "INTERNAL" : "RESPONSE_INVALID" });
};

const transportFailure = (method: ClientMethod, error: unknown, online: boolean) => {
  if (!online) return new ClientError({ method, code: "OFFLINE", message: "Offline" });
  if (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return new ClientError({ method, code: "TIMEOUT", message: "Request timed out" });
  }
  return new ClientError({ method, code: "API_UNREACHABLE", message: "Network request failed" });
};

const parseJson = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const callLive = async <M extends ClientMethod>(
  config: HttpConfig,
  method: M,
  input: ClientInput<M>,
): Promise<ClientOutput<M>> => {
  const schemas = clientMethodSchemas[method];
  const parsedInput = schemas.input.safeParse(input);
  if (!parsedInput.success) {
    throw new ClientError({
      method,
      code: "VALIDATION_FAILED",
      message: parsedInput.error.message,
      details: { issues: parsedInput.error.issues },
    });
  }
  const fields = isFields(parsedInput.data) ? parsedInput.data : {};
  const { url, init } = buildRequest(routeFor(method, input), fields, config);
  const online = config.isOnline ?? (() => typeof navigator === "undefined" || navigator.onLine);
  let response: Response;
  try {
    response = await (config.fetcher ?? fetch)(url, {
      ...init,
      signal: AbortSignal.timeout(config.timeoutMs ?? 20_000),
    });
  } catch (error) {
    throw transportFailure(method, error, online());
  }
  const json = parseJson(await response.text());
  if (!response.ok) {
    if (response.status === 401) config.onUnauthenticated?.(method);
    throw failureFrom(method, response, json);
  }
  const parsed = envelope(schemas.output).safeParse(json);
  if (!parsed.success) {
    throw new ClientError({
      method,
      code: "RESPONSE_INVALID",
      message: parsed.error.message,
      status: response.status,
      requestId: response.headers.get("x-request-id"),
    });
  }
  config.onMeta?.(readMeta(method, json));
  return parsed.data.data as ClientOutput<M>;
};
