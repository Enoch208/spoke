import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { caseAction, clientMethodSchemas, riskCaseDetail } from "@spoke/protocol";
import { records } from "../db/schema.js";
import { newId, present } from "../db/store.js";
import { accountId, input, paged, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { runReconciliation } from "../services/ops-reconciliation.js";
import type { Services } from "../types.js";

const liveActions = new Set([
  "addNote",
  "assign",
  "close",
  "reopen",
  "openCase",
  "dismissReport",
  "acknowledgeAlert",
]);
export const opsRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  route(app, services, "GET", "/ops/queue", "operator", async (c) =>
    ok(c, await paged(c, services, "case")),
  );
  route(app, services, "GET", "/ops/cases/:id", "operator", async (c) =>
    ok(
      c,
      riskCaseDetail.parse(present(await store.require("case", z.uuid().parse(c.req.param("id"))))),
    ),
  );
  route(app, services, "POST", "/ops/cases/:id/actions", "operator", async (c) => {
    const body = await input(c, caseAction.strict());
    if (!liveActions.has(body.action))
      throw new ApiProblem(
        409,
        "FEATURE_NOT_AVAILABLE",
        "This operator action is available in Demo mode.",
      );
    if (
      body.action === "assign" &&
      (!body.assignee || !services.operators.includes(body.assignee.toLowerCase()))
    )
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "Assign this case to a configured operator address.",
      );
    const id = z.uuid().parse(c.req.param("id"));
    const at = new Date().toISOString();
    const updated = await store.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`case:${id}`}, 0))`);
      const [row] = await tx
        .select()
        .from(records)
        .where(and(eq(records.kind, "case"), eq(records.id, id)));
      if (!row) throw new ApiProblem(404, "NOT_FOUND", "No such case.");
      const current = riskCaseDetail.parse(present(row));
      if (current.revision !== body.revision)
        throw new ApiProblem(
          409,
          "CONFLICT",
          "Case changed since it was opened. Refresh and retry.",
        );
      const payload = {
        ...row.payload,
        revision: current.revision + 1,
        assignedTo: body.action === "assign" ? body.assignee : current.assignedTo,
        status: ["close", "dismissReport", "acknowledgeAlert"].includes(body.action)
          ? "closed"
          : ["reopen", "openCase"].includes(body.action)
            ? "open"
            : current.status,
        notes: [
          ...current.notes,
          {
            actor: c.get("session").address,
            internalNote: body.internalNote,
            publicNote: body.publicNote ?? null,
            at,
          },
        ],
      };
      const [result] = await tx
        .update(records)
        .set({ payload, updatedAt: new Date() })
        .where(and(eq(records.kind, "case"), eq(records.id, id)))
        .returning();
      if (!result) throw new Error("Case update lost its record");
      await tx.insert(records).values({
        kind: "audit",
        id: newId(),
        owner: accountId(c),
        payload: {
          actor: c.get("session").address,
          role: "operator",
          action: body.action,
          resource: id,
          beforeHash: null,
          afterHash: null,
          at,
        },
      });
      return result;
    });
    return ok(c, present(updated));
  });
  route(app, services, "GET", "/ops/audit", "operator", async (c) =>
    ok(c, await paged(c, services, "audit")),
  );
  route(app, services, "GET", "/ops/moderation", "operator", async (c) =>
    ok(c, await paged(c, services, "support")),
  );
  route(app, services, "GET", "/ops/reconciliation", "operator", async (c) => {
    const row = await store.get("reconciliation", "latest");
    return ok(c, row ? [row.payload] : []);
  });
  route(app, services, "POST", "/ops/reconciliation", "operator", async (c) => {
    const runId = newId();
    const result = await runReconciliation(services);
    await store.put("reconciliation-run", runId, "system", result);
    await store.audit(accountId(c), "reconciliation.run", runId);
    return ok(c, { runId });
  });
  route(app, services, "POST", "/ops/incidents", "operator", async (c) => {
    const body = await input(c, clientMethodSchemas["ops.incident"].input.strict());
    const id = body.id ?? newId();
    const at = new Date().toISOString();
    const row = await store.revise("incident", id, "system", (previous) => ({
      ...body,
      startsAt: previous?.payload.startsAt ?? at,
      endsAt: body.status === "resolved" ? at : null,
      updatedAt: at,
      updates: [
        ...z
          .array(z.object({ message: z.string(), at: z.string() }))
          .parse(previous?.payload.updates ?? []),
        { message: body.publicMessage, at },
      ],
    }));
    await store.audit(accountId(c), "incident.update", id);
    return ok(c, present(row), body.id ? 200 : 201);
  });
  return app;
};
