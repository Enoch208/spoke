import { and, eq, gt } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import { Hono } from "hono";
import { z } from "zod";
import { digest, present } from "../db/store.js";
import { confirmations, sessions } from "../db/schema.js";
import type { ApiContext, Services, Variables } from "../types.js";
import { ApiProblem } from "./problem.js";
import { clientRoutes, type ClientMethod } from "@spoke/protocol";

export type AuthLevel = "public" | "session" | "merchant" | "operator";
export type Endpoint = { method: string; path: string; auth: AuthLevel; schemaVersion: string };
export const routeRegistry: Endpoint[] = [];
export const equivalentPath = (left: string, right: string) =>
  left.replace(/:[^/]+/g, ":parameter") === right.replace(/:[^/]+/g, ":parameter");
export const router = () => new Hono<{ Variables: Variables }>();
export type Router = ReturnType<typeof router>;

export const requireSession = async (c: ApiContext, services: Services) => {
  const raw = getCookie(c, services.production ? "__Host-spoke_session" : "spoke_session");
  if (!raw) throw new ApiProblem(401, "UNAUTHENTICATED", "Sign in to continue.");
  const [session] = await services.store.db
    .select()
    .from(sessions)
    .where(and(eq(sessions.hash, digest(raw)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!session) throw new ApiProblem(401, "UNAUTHENTICATED", "Your session has expired.");
  if (
    (await services.store.identity("wallet", session.address.toLowerCase())) !== session.accountId
  )
    throw new ApiProblem(
      401,
      "UNAUTHENTICATED",
      "This signing wallet is no longer linked to the account.",
    );
  c.set("session", session);
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    if (
      c.req.header("origin") !== services.webOrigin ||
      digest(c.req.header("x-csrf-token") ?? "") !== session.csrfHash
    )
      throw new ApiProblem(403, "NOT_AUTHORIZED", "A valid origin and CSRF token are required.");
  }
  return session;
};

export const route = (
  app: Router,
  services: Services,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  auth: AuthLevel,
  handler: (c: ApiContext) => Promise<Response> | Response,
) => {
  if (!routeRegistry.some((entry) => entry.method === method && entry.path === `/v1${path}`))
    routeRegistry.push({ method, path: `/v1${path}`, auth, schemaVersion: "3.0" });
  app.on(method, path, async (c) => {
    const entry = Object.entries(clientRoutes).find(
      ([, candidate]) => candidate.verb === method && equivalentPath(candidate.path, path),
    );
    c.set("clientMethod", entry ? (entry[0] as ClientMethod) : null);
    if (auth !== "public") {
      const session = await requireSession(c, services);
      if (auth === "merchant") await merchantFor(c, services);
      if (auth === "operator" && !services.operators.includes(session.address.toLowerCase()))
        throw new ApiProblem(403, "NOT_AUTHORIZED", "Operator access is required.");
      await services.store.rate(`session:${session.accountId}`, 300, 60);
    }
    return handler(c);
  });
};

export const input = async <T extends z.ZodType>(c: ApiContext, schema: T): Promise<z.infer<T>> => {
  if (!c.req.header("content-type")?.startsWith("application/json"))
    throw new ApiProblem(415, "VALIDATION_FAILED", "Send an application/json body.");
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ApiProblem(400, "VALIDATION_FAILED", "Request body is not valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    throw new ApiProblem(
      400,
      "VALIDATION_FAILED",
      "Request does not match the API schema.",
      false,
      {
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      },
    );
  return parsed.data;
};
export const accountId = (c: ApiContext) => c.get("session").accountId;
export const merchantFor = async (c: ApiContext, { store }: Services) => {
  const { items } = await store.list("merchant", accountId(c), undefined, 1);
  const row = items[0];
  if (!row || row.payload.closedAt)
    throw new ApiProblem(403, "NOT_AUTHORIZED", "Set up a merchant workspace first.");
  return row;
};
export const stepUp = async (c: ApiContext, services: Services, action: string, token: string) => {
  const [confirmation] = await services.store.db
    .delete(confirmations)
    .where(
      and(
        eq(confirmations.hash, digest(token)),
        eq(confirmations.sessionHash, c.get("session").hash),
        eq(confirmations.action, action),
        gt(confirmations.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!confirmation)
    throw new ApiProblem(403, "REAUTH_REQUIRED", "Confirm this action with a new signature.");
};
export const paged = async (c: ApiContext, services: Services, kind: string, owner?: string) => {
  const { limit, cursor } = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().max(100).optional(),
    })
    .parse(c.req.query());
  const page = await services.store.list(kind, owner, cursor, limit);
  return { ...page, items: page.items.map(present) };
};
