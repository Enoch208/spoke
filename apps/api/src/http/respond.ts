import { clientMethodSchemas, type ErrorCode } from "@spoke/protocol";
import { ApiProblem } from "./problem.js";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppVariables } from "./request-id.js";

type AppContext = Context<{ Variables: AppVariables }>;

export const ok = (c: AppContext, data: unknown, status: ContentfulStatusCode = 200): Response =>
  c.json(
    {
      requestId: c.get("requestId"),
      timestamp: new Date().toISOString(),
      schemaVersion: "3.0",
      chainId: c.get("chainId"),
      contractAddress: c.get("contractAddress"),
      blockNumber: c.get("blockNumber"),
      indexingStatus: c.get("indexingStatus"),
      data: validated(c, data),
    },
    status,
  );

const validated = (c: AppContext, data: unknown): unknown => {
  const method = c.get("clientMethod");
  if (!method) return data;
  const parsed = clientMethodSchemas[method].output.safeParse(data);
  if (!parsed.success) {
    process.stderr.write(`${c.get("requestId")} invalid_response ${method}\n`);
    throw new ApiProblem(500, "INTERNAL", "The response could not be validated.", true);
  }
  return parsed.data;
};

export const fail = (
  c: AppContext,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
  retryable = false,
  details?: Record<string, unknown>,
) =>
  c.json(
    {
      error: {
        code,
        message,
        retryable,
        requestId: c.get("requestId"),
        ...(details ? { details } : {}),
      },
    },
    status,
  );
