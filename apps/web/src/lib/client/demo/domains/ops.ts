import { demoId, iso } from "../../../../demo/world/ids";
import { appendAudit, operatorEvent } from "../../../../demo/world/seed-platform-audit";
import { freezeEndsAt, tabOf } from "../../../../demo/world/seed-platform-moderation";
import { SEEDED_INCIDENTS } from "../../../../demo/world/seed-platform-ops";
import { SEEDED_RUNS, reconcile } from "../../../../demo/world/seed-platform-recon";
import type { DemoOpsCase, Incident, SupportItem } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { page } from "../views/basics";
import { actOnCase, caseWire } from "./platform-ops-act";

const severityRank: Record<DemoOpsCase["severity"], number> = { high: 0, medium: 1, low: 2 };

const queueOrder = (a: DemoOpsCase, b: DemoOpsCase) =>
  severityRank[a.severity] - severityRank[b.severity] ||
  Date.parse(a.detail.createdAt) - Date.parse(b.detail.createdAt);

const moderationWire = (item: SupportItem, now: number): SupportItem => ({
  ...item,
  status:
    item.status === "open" && tabOf(item) === "Frozen" && freezeEndsAt(item) <= now
      ? "resolved"
      : item.status,
});

const incidentWire = (incident: Incident): Incident => ({
  ...incident,
  updates: [...incident.updates],
});

export const opsReads = {
  "ops.queue": (input, runtime) => {
    const rows = [...runtime.world.opsCases].sort(queueOrder).map(({ detail }) => ({
      id: detail.id,
      category: detail.category,
      status: detail.status,
      revision: detail.revision,
      assignedTo: detail.assignedTo,
      createdAt: detail.createdAt,
    }));
    return page(rows, input);
  },
  "ops.case": (input, runtime) =>
    caseWire(
      found(
        runtime.world.opsCases.find((opsCase) => opsCase.detail.id === input.id),
        "This case",
      ),
    ),
  "ops.moderation": (input, runtime) => {
    const now = runtime.now();
    const rows = [...runtime.world.moderation]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((item) => moderationWire(item, now));
    return page(rows, input);
  },
  "ops.audit": (input, runtime) => page([...runtime.world.opsAudit].reverse(), input),
  "ops.reconciliation": (_input, runtime) => [...runtime.world.reconciliations].reverse(),
} satisfies PartialHandlers<"ops">;

export const opsWrites = {
  "ops.act": (input, runtime) => actOnCase(input, runtime),
  "ops.runReconciliation": (_input, runtime) => {
    const { world } = runtime;
    const now = runtime.now();
    const lastRun = world.opsAudit.findLast((entry) => entry.action === "reconciliationRun");
    if (lastRun?.at === iso(now))
      fail("CONFLICT", "A reconciliation run is already in progress. Try again in a moment.");
    const runId = demoId("recon", SEEDED_RUNS + runtime.nextId("recon"));
    world.reconciliations.push(reconcile(world, now, 0n));
    appendAudit(world.opsAudit, operatorEvent(`reconciliation:${runId}`, "reconciliationRun", now));
    return { runId };
  },
  "ops.incident": (input, runtime) => {
    const { world } = runtime;
    const at = iso(runtime.now());
    const resolving = input.status === "resolved";
    const update = { message: input.publicMessage, at };
    if (input.id !== undefined) {
      const incident = found(
        world.incidents.find((candidate) => candidate.id === input.id),
        "This incident",
      );
      incident.title = input.title;
      incident.impact = input.impact;
      incident.severity = input.severity;
      incident.endsAt = resolving ? (incident.endsAt ?? at) : null;
      incident.updatedAt = at;
      incident.updates.push(update);
      appendAudit(
        world.opsAudit,
        operatorEvent(
          `incident:${incident.id}`,
          resolving ? "incidentResolved" : "incidentUpdated",
          runtime.now(),
        ),
      );
      return incidentWire(incident);
    }
    const incident: Incident = {
      id: demoId("incident", SEEDED_INCIDENTS + runtime.nextId("incident")),
      title: input.title,
      impact: input.impact,
      severity: input.severity,
      startsAt: at,
      endsAt: resolving ? at : null,
      updatedAt: at,
      updates: [update],
    };
    world.incidents.push(incident);
    appendAudit(
      world.opsAudit,
      operatorEvent(`incident:${incident.id}`, "incidentDeclared", runtime.now()),
    );
    return incidentWire(incident);
  },
} satisfies PartialHandlers<"ops">;
