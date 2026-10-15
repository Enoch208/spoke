import { encryptedNote, workspaceScope, workspaceWrite } from "@spoke/protocol";
import { digest } from "../db/store.js";
import { accountId, input, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { ApiContext, Services } from "../types.js";

export const workspaceRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  const authorize = async (c: ApiContext) => {
    const session = c.get("session");
    const account = await store.require("account", session.accountId);
    if (account.payload.accountKind !== "passkey" || session.method !== "passkey")
      throw new ApiProblem(
        403,
        "NOT_ELIGIBLE",
        "Sign in with your Spoke passkey to access the private workspace.",
      );
    return session.address.toLowerCase();
  };
  const scopeOf = (c: ApiContext) =>
    workspaceScope.parse({
      chainId: Number(c.req.param("chainId")),
      campaignId: c.req.param("campaignId"),
    });
  route(app, services, "GET", "/me/workspace", "session", async (c) => {
    const address = await authorize(c);
    const rows = await store.list("encrypted-workspace", accountId(c), undefined, 100);
    return ok(c, {
      maxNotes: 100,
      items: rows.items
        .map((row) => ({
          ...encryptedNote.parse(row.payload),
          updatedAt: row.updatedAt.toISOString(),
        }))
        .filter((row) => row.address === address)
        .map(({ address, chainId, campaignId, updatedAt }) => ({
          address,
          chainId,
          campaignId,
          updatedAt,
        })),
    });
  });
  route(app, services, "GET", "/me/workspace/:chainId/:campaignId", "session", async (c) => {
    const address = await authorize(c);
    const { chainId, campaignId } = scopeOf(c);
    const row = await store.get(
      "encrypted-workspace",
      digest(`${address}:${String(chainId)}:${campaignId}`),
    );
    if (row && row.owner !== accountId(c))
      throw new ApiProblem(404, "NOT_FOUND", "No such workspace.");
    return ok(c, {
      note: row ? encryptedNote.parse(row.payload) : null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    });
  });
  route(app, services, "PUT", "/me/workspace/:chainId/:campaignId", "session", async (c) => {
    const address = await authorize(c);
    const scope = scopeOf(c);
    const { note, expectedRevision } = await input(
      c,
      workspaceWrite.omit({ chainId: true, campaignId: true }).strict(),
    );
    if (
      note.address !== address ||
      note.chainId !== scope.chainId ||
      note.campaignId !== scope.campaignId ||
      scope.chainId !== services.chain.chainId
    )
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "The encrypted note does not match this account, chain and campaign.",
      );
    await store.require("campaign", scope.campaignId);
    await store.require("passkey", digest(note.credentialId), accountId(c));
    await store.rate(`workspace-save:${accountId(c)}`, 20, 60);
    const id = digest(`${address}:${String(scope.chainId)}:${scope.campaignId}`);
    const saved = await store.exclusive(`workspace:${accountId(c)}`, async () => {
      const current = await store.get("encrypted-workspace", id);
      if (current && current.owner !== accountId(c))
        throw new ApiProblem(404, "NOT_FOUND", "No such workspace.");
      if (current?.payload.revision === note.revision) {
        if (JSON.stringify(encryptedNote.parse(current.payload)) === JSON.stringify(note))
          return current;
        throw new ApiProblem(409, "CONFLICT", "An existing revision cannot be changed.");
      }
      if ((current?.payload.revision ?? null) !== expectedRevision)
        throw new ApiProblem(
          409,
          "CONFLICT",
          "Notes changed on another device. Your local copy is kept. Reopen and choose which copy to use.",
        );
      if (
        !current &&
        (await store.list("encrypted-workspace", accountId(c), undefined, 100)).items.length >= 100
      )
        throw new ApiProblem(
          409,
          "NOT_ELIGIBLE",
          "This private workspace has reached its 100-notebook limit.",
        );
      return store.put("encrypted-workspace", id, accountId(c), note);
    });
    return ok(c, {
      note: encryptedNote.parse(saved.payload),
      updatedAt: saved.updatedAt.toISOString(),
    });
  });
  return app;
};
