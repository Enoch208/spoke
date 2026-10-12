import { DAY, HOUR, demoId, iso } from "./ids";
import { chainAudit, operatorEvent, systemEvent, type AuditEvent } from "./seed-platform-audit";
import { seedCases } from "./seed-platform-cases";
import { moderationTimes, seedModeration } from "./seed-platform-moderation";
import { runEvents } from "./seed-platform-recon";
import type { DemoCore } from "./types";
import type { Incident } from "./world";

export const SEEDED_INCIDENTS = 1;

const incidentTimes = (anchor: number) => {
  const startsAt = anchor - 6 * DAY;
  return { startsAt, identified: startsAt + HOUR, endsAt: startsAt + 3 * HOUR };
};

export const seedIncidents = (core: DemoCore): Incident[] => {
  const times = incidentTimes(core.anchor);
  return [
    {
      id: demoId("incident", 1),
      title: "Sample incident · delayed sync",
      impact:
        "Sample: dashboards showed new sales up to 20 minutes late. Onchain records were not affected.",
      severity: "degraded",
      startsAt: iso(times.startsAt),
      endsAt: iso(times.endsAt),
      updatedAt: iso(times.endsAt),
      updates: [
        { message: "We're looking into delayed sales on dashboards.", at: iso(times.startsAt) },
        {
          message: "The indexer fell behind after a node restart. It is catching up.",
          at: iso(times.identified),
        },
        {
          message: "Dashboards are current again. Every onchain record was intact throughout.",
          at: iso(times.endsAt),
        },
      ],
    },
  ];
};

const moderationEvents = (core: DemoCore): AuditEvent[] => {
  const at = moderationTimes(core.anchor);
  return [
    systemEvent(
      "reports",
      `report:${demoId("case", 3)}-report`,
      "reportReceived",
      at.counterfeitReport,
    ),
    systemEvent("reports", `report:${demoId("report", 2)}`, "reportReceived", at.impersonation),
    systemEvent("reports", `report:${demoId("report", 3)}`, "reportReceived", at.spam),
    operatorEvent(`distributor:${demoId("u", 28)}`, "hideFromDiscovery", at.hidden),
  ];
};

const incidentEvents = (core: DemoCore): AuditEvent[] => {
  const times = incidentTimes(core.anchor);
  const resource = `incident:${demoId("incident", 1)}`;
  return [
    operatorEvent(resource, "incidentDeclared", times.startsAt),
    operatorEvent(resource, "incidentUpdated", times.identified),
    operatorEvent(resource, "incidentResolved", times.endsAt),
  ];
};

export const seedOps = (core: DemoCore) => {
  const { cases, events } = seedCases(core);
  return {
    opsCases: cases,
    moderation: seedModeration(core),
    incidents: seedIncidents(core),
    opsAudit: chainAudit([
      ...events,
      ...moderationEvents(core),
      ...incidentEvents(core),
      ...runEvents(core),
    ]),
  };
};
