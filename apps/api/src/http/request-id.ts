import { randomUUID } from "node:crypto";
import { createMiddleware } from "hono/factory";

export type AppVariables = { requestId: string };

export const requestId = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const id = `req_${randomUUID()}`;
  c.set("requestId", id);
  c.header("x-request-id", id);
  await next();
});
