import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import {
  handle,
  preferencesUpdate,
  profileUpdate,
  visibilityInput,
  walletAddress,
  notificationPreferences,
  me as meSchema,
} from "@spoke/protocol";
import { merchantView } from "../services/catalog.js";
import { identities, sessions } from "../db/schema.js";
import { present } from "../db/store.js";
import { accountId, input, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { ApiContext, Services } from "../types.js";

export const reservedHandles = new Set([
  "admin",
  "api",
  "spoke",
  "support",
  "root",
  "system",
  "merchant",
  "developer",
  "moderator",
  "usespoke",
  "official",
]);
export const accountRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  const me = async (c: ApiContext) => {
    const row = await store.require("account", accountId(c));
    const merchants = await store.list("merchant", accountId(c), undefined, 100);
    return {
      ...meSchema.parse({
        ...present(row),
        handleChangedAt: row.payload.handleChangedAt ?? null,
        handleChangeAvailableAt: row.payload.handleChangeAvailableAt ?? null,
        workspaces: await Promise.all(
          merchants.items.map((merchant) => merchantView(store, merchant, true)),
        ),
        isMerchant: merchants.items.some((item) => !item.payload.closedAt),
        isOperator: services.operators.includes(c.get("session").address.toLowerCase()),
      }),
      visibility: row.payload.visibility,
      currentSigner: c.get("session").address,
    };
  };
  route(app, services, "GET", "/me", "session", async (c) => ok(c, await me(c)));
  route(app, services, "PATCH", "/me", "session", async (c) => {
    const body = await input(c, profileUpdate);
    const row = await store.require("account", accountId(c));
    if (body.handle && body.handle !== row.payload.handle) {
      if (reservedHandles.has(body.handle))
        throw new ApiProblem(409, "HANDLE_RESERVED", "Choose a different handle.");
      if (
        typeof row.payload.handleChangedAt === "string" &&
        Date.parse(row.payload.handleChangedAt) > Date.now() - 30 * 86_400_000
      )
        throw new ApiProblem(
          409,
          "HANDLE_CHANGE_TOO_SOON",
          "You can change your handle once every 30 days.",
        );
      await store.reserve("handle", body.handle, row.id);
      if (typeof row.payload.handle === "string")
        await store.db
          .delete(identities)
          .where(
            and(
              eq(identities.namespace, "handle"),
              eq(identities.value, row.payload.handle),
              eq(identities.owner, row.id),
            ),
          );
    }
    const existingOnboarding = z
      .object({ intent: z.string().nullable(), completedAt: z.string().nullable() })
      .parse(row.payload.onboarding);
    const { intent, onboardingCompleted, ...profile } = body;
    await store.put("account", row.id, row.owner, {
      ...row.payload,
      ...profile,
      ...(body.handle && body.handle !== row.payload.handle
        ? {
            handleChangedAt: new Date().toISOString(),
            handleChangeAvailableAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          }
        : {}),
      onboarding: {
        intent: intent ?? existingOnboarding.intent,
        completedAt: onboardingCompleted
          ? new Date().toISOString()
          : existingOnboarding.completedAt,
      },
    });
    return ok(c, await me(c));
  });
  route(app, services, "GET", "/handles/:handle", "public", async (c) => {
    await store.rate(`handles:${c.get("ip")}`, 30, 60);
    const parsed = handle.safeParse(c.req.param("handle") ?? "");
    const reason = !parsed.success
      ? "invalid"
      : reservedHandles.has(parsed.data)
        ? "reserved"
        : (await store.identity("handle", parsed.data))
          ? "taken"
          : null;
    return ok(c, { available: reason === null, reason, suggestions: [] });
  });
  route(app, services, "GET", "/me/balances", "session", async (c) => {
    const address = walletAddress.parse(c.req.query("address") ?? c.get("session").address);
    if ((await store.identity("wallet", address.toLowerCase())) !== accountId(c))
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Wallet is not linked to this account.");
    return ok(c, await chain.balances(address));
  });
  route(app, services, "POST", "/me/recovery-check", "session", async (c) => {
    await input(c, z.strictObject({}));
    const row = await store.require("account", accountId(c));
    if (row.payload.accountKind !== "passkey")
      throw new ApiProblem(403, "NOT_ELIGIBLE", "Recovery check is for passkey accounts.");
    const checkedAt = new Date().toISOString();
    await store.put("account", row.id, row.owner, { ...row.payload, recovery: { checkedAt } });
    return ok(c, { checkedAt });
  });
  route(app, services, "GET", "/me/sessions", "session", async (c) => {
    const rows = await store.db
      .select({
        id: sessions.id,
        deviceLabel: sessions.deviceLabel,
        method: sessions.method,
        signedInAt: sessions.signedInAt,
        lastActiveAt: sessions.lastActiveAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.accountId, accountId(c)));
    return ok(
      c,
      rows.map((row) => ({ ...row, isCurrent: row.id === c.get("session").id })),
    );
  });
  route(app, services, "DELETE", "/me/sessions", "session", async (c) => {
    const body = await input(
      c,
      z.union([
        z.strictObject({ sessionId: z.uuid() }),
        z.strictObject({ scope: z.enum(["others", "all"]) }),
      ]),
    );
    await store.db
      .delete(sessions)
      .where(
        and(
          eq(sessions.accountId, accountId(c)),
          "sessionId" in body
            ? eq(sessions.id, body.sessionId)
            : body.scope === "others"
              ? ne(sessions.id, c.get("session").id)
              : undefined,
        ),
      );
    return ok(c, { ok: true });
  });
  const preferences = {
    displayCurrency: "SDUSD",
    theme: "system",
    language: "en",
    startWorkspace: "earn",
    earnChecklistHidden: false,
  };
  for (const [path, kind, defaults, schema] of [
    ["/me/preferences", "preferences", preferences, preferencesUpdate],
    [
      "/me/notification-preferences",
      "notification-preferences",
      notificationPreferences.parse({}),
      notificationPreferences.partial(),
    ],
  ] as const) {
    route(app, services, "GET", path, "session", async (c) =>
      ok(c, (await store.get(kind, accountId(c)))?.payload ?? defaults),
    );
    route(app, services, "PATCH", path, "session", async (c) => {
      const body = await input(c, schema);
      const previous = (await store.get(kind, accountId(c)))?.payload ?? defaults;
      return ok(
        c,
        (await store.put(kind, accountId(c), accountId(c), { ...previous, ...body })).payload,
      );
    });
  }
  route(app, services, "PATCH", "/me/reputation/visibility", "session", async (c) => {
    const body = await input(c, visibilityInput);
    const row = await store.require("account", accountId(c));
    await store.put("account", row.id, row.owner, { ...row.payload, visibility: body });
    return ok(c, body);
  });
  return app;
};
