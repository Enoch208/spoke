import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso } from "../../../../demo/world/ids";
import {
  SAMPLE_OPERATOR,
  appendAudit,
  operatorEvent,
} from "../../../../demo/world/seed-platform-audit";
import type { CaseActionId } from "../../../../demo/world/seed-platform-case-seeds";
import {
  FREEZE_TERM,
  frozenText,
  hiddenText,
  noticeText,
  reportTargets,
  subjectLabel,
  subjectParts,
  tabOf,
  type ModerationTab,
  type SubjectKind,
} from "../../../../demo/world/seed-platform-moderation";
import type {
  DemoOpsCase,
  DemoWorld,
  RiskCaseDetail,
  SupportItem,
} from "../../../../demo/world/world";
import { fail, type DemoInput } from "../handler";
import {
  dismissReport,
  isActive,
  linkedCase,
  resolveAppeals,
  restoreItems,
  settle,
  upsert,
} from "./platform-ops-moderation";

type CaseAction = DemoInput<"ops.act">["action"];

const reasonless = new Set<CaseActionId>(["addNote", "assign"]);
const needsPublicNote = new Set<CaseActionId>(["requestInformation", "addPublicNotice"]);
const allowedWhileClosed = new Set<CaseActionId>(["addNote", "reopen"]);
const appliesTo: Partial<Record<CaseActionId, readonly SubjectKind[]>> = {
  acknowledgeAlert: ["alert"],
  requestInformation: ["merchant", "distributor"],
  hideFromDiscovery: ["campaign", "merchant", "distributor"],
  addPublicNotice: ["campaign", "merchant"],
  freezeNewActivity: ["campaign", "merchant", "distributor"],
  askMerchantToPause: ["campaign"],
};
const reversible: readonly ModerationTab[] = ["Hidden", "Notice", "Frozen"];

export const caseWire = (opsCase: DemoOpsCase): RiskCaseDetail => ({
  ...opsCase.detail,
  evidence: [...opsCase.detail.evidence],
  notes: [...opsCase.detail.notes],
});

const checkNotes = (action: CaseAction) => {
  if (action.internalNote.trim().length < 20)
    fail("VALIDATION_FAILED", "The internal note needs at least 20 characters.");
  if (!reasonless.has(action.action) && action.reasonCategory.trim() === "")
    fail("VALIDATION_FAILED", "Choose a reason category for this action.");
  if (needsPublicNote.has(action.action) && (action.publicNote ?? "").trim() === "")
    fail(
      "VALIDATION_FAILED",
      "This action needs a public note. It is shown to the person it concerns.",
    );
};

const applyEffect = (
  world: DemoWorld,
  opsCase: DemoOpsCase,
  item: SupportItem | undefined,
  action: CaseAction,
  now: number,
) => {
  const detail = opsCase.detail;
  const label = subjectLabel(world, opsCase.subject);
  switch (action.action) {
    case "assign":
      detail.assignedTo = action.assignee ?? SAMPLE_OPERATOR;
      return;
    case "close":
      if (detail.status === "closed")
        return fail("VALIDATION_FAILED", "This case is already closed.");
      detail.status = "closed";
      resolveAppeals(world, opsCase, now);
      return;
    case "reopen":
      if (detail.status === "open") return fail("VALIDATION_FAILED", "This case is already open.");
      detail.status = "open";
      return;
    case "openCase":
      return fail("VALIDATION_FAILED", `This is already linked to case ${detail.id}.`);
    case "dismissReport":
      dismissReport(world, opsCase, item, now);
      return;
    case "hideFromDiscovery": {
      const hidden = world.moderation.find((candidate) => candidate.id === `${detail.id}-hidden`);
      if (hidden && isActive(hidden, now))
        return fail("VALIDATION_FAILED", "This subject is already hidden from discovery.");
      upsert(world, opsCase, "Hidden", hiddenText(label), now);
      return;
    }
    case "addPublicNotice":
      upsert(world, opsCase, "Notice", noticeText(action.publicNote ?? ""), now);
      return;
    case "freezeNewActivity":
      upsert(world, opsCase, "Frozen", frozenText(label, now + FREEZE_TERM), now);
      return;
    case "restore":
      restoreItems(world, opsCase, item, reversible, now);
      return;
    case "liftFreeze":
      restoreItems(world, opsCase, item, ["Frozen"], now);
      return;
    default:
      return;
  }
};

const checkApplies = (opsCase: DemoOpsCase, action: CaseAction) => {
  const kinds = appliesTo[action.action];
  const kind = subjectParts(opsCase.subject)?.kind;
  if (kinds && (kind === undefined || !kinds.includes(kind)))
    fail("VALIDATION_FAILED", `${action.action} doesn't apply to this case's subject.`);
  if (opsCase.detail.status === "closed" && !allowedWhileClosed.has(action.action))
    fail("VALIDATION_FAILED", "This case is closed. Reopen it first.");
};

const record = (runtime: DemoRuntime, opsCase: DemoOpsCase, action: CaseAction) => {
  const now = runtime.now();
  opsCase.detail.revision += 1;
  opsCase.detail.notes.push({
    actor: SAMPLE_OPERATOR,
    internalNote: action.internalNote,
    publicNote: action.publicNote ?? null,
    at: iso(now),
  });
  appendAudit(
    runtime.world.opsAudit,
    operatorEvent(`case:${opsCase.detail.id}`, action.action, now),
  );
  return caseWire(opsCase);
};

const caseFromReport = (runtime: DemoRuntime, report: SupportItem, action: CaseAction) => {
  if (action.action !== "openCase" && action.action !== "dismissReport")
    fail("VALIDATION_FAILED", "Open a case for this report first.");
  if (action.revision !== 1)
    fail("CONFLICT", "This report changed since you opened it. Reload and try again.");
  const now = runtime.now();
  const detail = report.category.split(" · ")[1];
  const opsCase: DemoOpsCase = {
    severity: "medium",
    subject: reportTargets[report.id] ?? `report:${report.id}`,
    detail: {
      id: `${report.id}-case`,
      category: detail === "Counterfeit" ? "Counterfeit or misleading listing" : "Content report",
      status: action.action === "openCase" ? "open" : "closed",
      revision: 0,
      assignedTo: null,
      createdAt: iso(now),
      evidence: [],
      notes: [],
    },
  };
  runtime.world.opsCases.push(opsCase);
  settle(report, action.action === "openCase" ? "answered" : "declined", now);
  return record(runtime, opsCase, action);
};

export const actOnCase = (input: DemoInput<"ops.act">, runtime: DemoRuntime): RiskCaseDetail => {
  const { world } = runtime;
  const action = input.action;
  checkNotes(action);
  const item = world.moderation.find((candidate) => candidate.id === input.id);
  const opsCase = item
    ? linkedCase(world, item)
    : world.opsCases.find((candidate) => candidate.detail.id === input.id);
  if (item && !opsCase && tabOf(item) === "Report") return caseFromReport(runtime, item, action);
  if (!opsCase) return fail("NOT_FOUND", "No case with this ID.");
  if (action.revision !== opsCase.detail.revision)
    fail("CONFLICT", "This case changed since you opened it. Reload it and try again.");
  checkApplies(opsCase, action);
  applyEffect(world, opsCase, item, action, runtime.now());
  return record(runtime, opsCase, action);
};
