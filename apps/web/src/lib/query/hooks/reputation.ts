import { mutationHook, queryHook } from "../use-client";

export const useReputationGet = queryHook("reputation.get");
export const useReputationMine = queryHook("reputation.mine");
export const useReputationUpdateVisibilityMutation = mutationHook("reputation.updateVisibility", [
  "reputation",
  "distributors",
  "account",
]);
export const useReputationExportCredentialMutation = mutationHook("reputation.exportCredential", [
  "reputation",
]);
export const useReputationCredentials = queryHook("reputation.credentials");
export const useReputationRevokeCredentialMutation = mutationHook("reputation.revokeCredential", [
  "reputation",
]);
export const useReputationVerifyCredentialMutation = mutationHook(
  "reputation.verifyCredential",
  [],
);
