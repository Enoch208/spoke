import { getCookie } from "hono/cookie";
import { clientMethodSchemas } from "@spoke/protocol";
import { newId, present } from "../db/store.js";
import { accountId, input, requireSession, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";

export const supportRoutes = (services: Services) => {
  const app = router();
  for (const [path, method] of [
    ["/support/reports", "support.report"],
    ["/support/contact", "support.contact"],
  ] as const)
    route(app, services, "POST", path, "public", async (c) => {
      await services.store.rate(`support:${c.get("ip")}`, 5, 3600);
      const body = await input(c, clientMethodSchemas[method].input);
      const authenticated = getCookie(
        c,
        services.production ? "__Host-spoke_session" : "spoke_session",
      );
      const owner = authenticated ? (await requireSession(c, services)).accountId : "public";
      const id = newId();
      const at = new Date().toISOString();
      const category = "category" in body ? body.category : "contact";
      await services.store.exclusive(`support:${id}`, async () => {
        await services.store.put("support", id, owner, {
          ...body,
          subject: body.subject ?? category,
          category,
          status: "open",
        });
        await services.store.put("case", id, "system", {
          ticketId: id,
          category,
          status: "open",
          revision: 1,
          assignedTo: null,
          evidence: [],
          notes: [],
          createdAt: at,
        });
      });
      return ok(c, { ticketId: id }, 201);
    });
  route(app, services, "GET", "/me/support", "session", async (c) => {
    const rows = await services.store.db.query.records.findMany({
      where: (table, { and, eq }) => and(eq(table.kind, "support"), eq(table.owner, accountId(c))),
    });
    return ok(c, rows.map(present));
  });
  return app;
};
