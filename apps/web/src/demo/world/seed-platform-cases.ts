import { demoId, iso } from "./ids";
import {
  SAMPLE_OPERATOR,
  operatorEvent,
  systemEvent,
  type AuditEvent,
} from "./seed-platform-audit";
import { caseSeeds, type CaseSeed } from "./seed-platform-case-seeds";
import type { DemoCore } from "./types";
import type { DemoOpsCase } from "./world";

const opener = (seed: CaseSeed) =>
  seed.openedBy === null ? SAMPLE_OPERATOR : `System · ${seed.openedBy}`;

const buildCase = (seed: CaseSeed): DemoOpsCase => {
  const closed =
    seed.steps.filter((step) => step.action === "close" || step.action === "reopen").at(-1)
      ?.action === "close";
  const assigned = seed.steps.some((step) => step.action === "assign");
  return {
    severity: seed.severity,
    subject: seed.subject,
    detail: {
      id: demoId("case", seed.n),
      category: seed.category,
      status: closed ? "closed" : "open",
      revision: 1 + seed.steps.length,
      assignedTo: assigned ? SAMPLE_OPERATOR : null,
      createdAt: iso(seed.openedAt),
      evidence: seed.evidence,
      notes: [
        {
          actor: opener(seed),
          internalNote: seed.trigger,
          publicNote: null,
          at: iso(seed.openedAt),
        },
        ...seed.steps.map((step) => ({
          actor: SAMPLE_OPERATOR,
          internalNote: step.note,
          publicNote: step.publicNote ?? null,
          at: iso(step.at),
        })),
      ],
    },
  };
};

const caseEvents = (seed: CaseSeed): AuditEvent[] => {
  const resource = `case:${demoId("case", seed.n)}`;
  return [
    seed.openedBy === null
      ? operatorEvent(resource, "openCase", seed.openedAt)
      : systemEvent(seed.openedBy, resource, "openCase", seed.openedAt),
    ...seed.steps.map((step) => operatorEvent(resource, step.action, step.at)),
  ];
};

export const seedCases = (core: DemoCore) => {
  const seeds = caseSeeds(core);
  return { cases: seeds.map(buildCase), events: seeds.flatMap(caseEvents) };
};
