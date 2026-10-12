import { mutationHook, queryHook } from "../use-client";

export const useApiKeysList = queryHook("apiKeys.list");
export const useApiKeysCreateMutation = mutationHook("apiKeys.create", ["apiKeys"]);
export const useApiKeysRevokeMutation = mutationHook("apiKeys.revoke", ["apiKeys"]);
export const useApiKeysUsage = queryHook("apiKeys.usage");
