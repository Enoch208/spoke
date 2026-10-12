import { mutationHook, queryHook } from "../use-client";

export const usePartnershipsList = queryHook("partnerships.list");
export const usePartnershipsProposeMutation = mutationHook("partnerships.propose", [
  "partnerships",
]);
export const usePartnershipsRespondMutation = mutationHook("partnerships.respond", [
  "partnerships",
]);
export const usePartnershipsTerminateMutation = mutationHook("partnerships.terminate", [
  "partnerships",
]);
