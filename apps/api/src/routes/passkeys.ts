import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { clientMethodSchemas, passkey } from "@spoke/protocol";
import { records } from "../db/schema.js";
import { digest } from "../db/store.js";
import { accountId, input, route, router, stepUp } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";

const credentialId = z
  .string()
  .min(16)
  .max(1024)
  .regex(/^[\w-]+$/);
const view = (payload: Record<string, unknown>) => passkey.parse(payload);

export const passkeyRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  route(app, services, "GET", "/me/passkeys", "session", async (c) =>
    ok(
      c,
      (await store.list("passkey", accountId(c), undefined, 100)).items.map((row) =>
        view(row.payload),
      ),
    ),
  );
  route(app, services, "POST", "/me/passkeys", "session", async (c) => {
    const body = await input(c, clientMethodSchemas["account.addPasskey"].input.strict());
    credentialId.parse(body.credentialId);
    const account = await store.require("account", accountId(c));
    if (account.payload.accountKind !== "passkey")
      throw new ApiProblem(403, "NOT_ELIGIBLE", "This account was not created with a passkey.");
    if (body.kind === "added") {
      if (!body.vault)
        throw new ApiProblem(
          400,
          "VALIDATION_FAILED",
          "An added passkey requires its encrypted vault.",
        );
      await stepUp(c, services, "account.addPasskey", body.confirmationToken ?? "");
    } else if (
      body.vault ||
      c.get("session").method !== "passkey" ||
      Date.now() - account.createdAt.getTime() > 300_000
    ) {
      throw new ApiProblem(
        403,
        "REAUTH_REQUIRED",
        "Original passkey registration is limited to account creation.",
      );
    }
    const payload = {
      credentialId: body.credentialId,
      label: body.label,
      kind: body.kind,
      deviceHint: body.transports.join(", "),
      transports: body.transports,
      vault: body.vault ?? null,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      hasVault: body.vault !== undefined,
    };
    await store.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`passkeys:${accountId(c)}`}, 0))`,
      );
      const current = await tx
        .select()
        .from(records)
        .where(and(eq(records.kind, "passkey"), eq(records.owner, accountId(c))));
      if (
        current.length >= 10 ||
        (body.kind === "original" && current.some((row) => row.payload.kind === "original"))
      )
        throw new ApiProblem(
          409,
          "CONFLICT",
          "Passkey limit reached or the original passkey is already registered.",
        );
      const [inserted] = await tx
        .insert(records)
        .values({ kind: "passkey", id: digest(body.credentialId), owner: accountId(c), payload })
        .onConflictDoNothing()
        .returning();
      if (!inserted) throw new ApiProblem(409, "CONFLICT", "This passkey is already registered.");
    });
    return ok(c, view(payload), 201);
  });
  route(app, services, "PATCH", "/me/passkeys/:credentialId", "session", async (c) => {
    const id = digest(credentialId.parse(c.req.param("credentialId")));
    const body = await input(c, z.strictObject({ label: z.string().min(1).max(80) }));
    const row = await store.revise("passkey", id, accountId(c), (previous) => {
      if (!previous) throw new ApiProblem(404, "NOT_FOUND", "No such passkey.");
      return { ...previous.payload, ...body };
    });
    return ok(c, view(row.payload));
  });
  route(app, services, "DELETE", "/me/passkeys/:credentialId", "session", async (c) => {
    const id = digest(credentialId.parse(c.req.param("credentialId")));
    const body = await input(c, z.strictObject({ confirmationToken: z.string().min(32).max(128) }));
    const row = await store.require("passkey", id, accountId(c));
    if (row.payload.kind === "original")
      throw new ApiProblem(409, "NOT_ELIGIBLE", "The original passkey cannot be removed.");
    await stepUp(c, services, "account.removePasskey", body.confirmationToken);
    await store.remove("passkey", id, accountId(c));
    await store.audit(accountId(c), "passkey-removed", id);
    return ok(c, { ok: true });
  });
  route(app, services, "GET", "/passkey-vaults/:credentialId", "public", async (c) => {
    await store.rate(`vault:${c.get("ip")}`, 10, 300);
    const id = digest(credentialId.parse(c.req.param("credentialId")));
    const row = await store.get("passkey", id);
    if (!row?.payload.hasVault || !row.payload.vault)
      throw new ApiProblem(404, "NOT_FOUND", "No such vault.");
    return ok(c, row.payload.vault);
  });
  return app;
};
