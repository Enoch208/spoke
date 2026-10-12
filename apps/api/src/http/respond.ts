import type { ErrorCode } from "@spoke/protocol";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppVariables } from "./request-id.js";

type AppContext = Context<{ Variables: AppVariables }>;

export const ok = <T>(c: AppContext, data: T, status: ContentfulStatusCode = 200) =>
  c.json({ requestId: c.get("requestId"), timestamp: new Date().toISOString(), data }, status);

export const fail = (
  c: AppContext,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
  retryable = false,
) => c.json({ error: { code, message, retryable, requestId: c.get("requestId") } }, status);
