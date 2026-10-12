import { mutationHook, queryHook } from "../use-client";

export const useTeamMembers = queryHook("team.members");
export const useTeamInviteMutation = mutationHook("team.invite", ["team"]);
export const useTeamUpdateRoleMutation = mutationHook("team.updateRole", ["team"]);
export const useTeamRemoveMutation = mutationHook("team.remove", ["team"]);
export const useTeamAudit = queryHook("team.audit");
export const useTeamTransferOwnershipMutation = mutationHook("team.transferOwnership", [
  "team",
  "merchants",
]);
