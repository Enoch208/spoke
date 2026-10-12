import { mutationHook, queryHook } from "../use-client";

export const useDisputesOpenMutation = mutationHook("disputes.open", ["disputes", "receipts"]);
export const useDisputesList = queryHook("disputes.list");
export const useDisputesGet = queryHook("disputes.get");
export const useDisputesRespondMutation = mutationHook("disputes.respond", [
  "disputes",
  "receipts",
]);
export const useDisputesExposure = queryHook("disputes.exposure");
