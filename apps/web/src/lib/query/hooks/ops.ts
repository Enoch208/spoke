import { mutationHook, queryHook } from "../use-client";

export const useOpsQueue = queryHook("ops.queue");
export const useOpsCase = queryHook("ops.case");
export const useOpsActMutation = mutationHook("ops.act", ["ops"]);
export const useOpsModeration = queryHook("ops.moderation");
export const useOpsAudit = queryHook("ops.audit");
export const useOpsReconciliation = queryHook("ops.reconciliation");
export const useOpsRunReconciliationMutation = mutationHook("ops.runReconciliation", ["ops"]);
export const useOpsIncidentMutation = mutationHook("ops.incident", ["ops", "system"]);
