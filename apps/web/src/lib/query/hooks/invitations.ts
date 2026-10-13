import { mutationHook, queryHook } from "../use-client";

export const useInvitationsMine = queryHook("invitations.mine");
export const useInvitationsSent = queryHook("invitations.sent");
export const useInvitationsSendMutation = mutationHook("invitations.send", [
  "invitations",
  "partners",
]);
export const useInvitationsRespondMutation = mutationHook("invitations.respond", [
  "invitations",
  "links",
  "campaigns",
  "notifications",
]);
export const useInvitationsWithdrawMutation = mutationHook("invitations.withdraw", [
  "invitations",
  "partners",
]);
