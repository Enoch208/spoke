import { mutationHook, queryHook } from "../use-client";

export const useIntegrationsList = queryHook("integrations.list");
export const useIntegrationsConnectMutation = mutationHook("integrations.connect", [
  "integrations",
]);
export const useIntegrationsDisconnectMutation = mutationHook("integrations.disconnect", [
  "integrations",
]);
export const useIntegrationsStatus = queryHook("integrations.status");
export const useIntegrationsReconciliation = queryHook("integrations.reconciliation");
export const useIntegrationsResolveMismatchMutation = mutationHook("integrations.resolveMismatch", [
  "integrations",
]);
