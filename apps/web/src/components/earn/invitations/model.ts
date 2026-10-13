import type { ClientOutput } from "@spoke/protocol";

export type Invitation = ClientOutput<"invitations.get">;
export const invitationStatus = (invitation: Invitation, now = Date.now()) =>
  invitation.status === "pending" && Date.parse(invitation.expiresAt) <= now
    ? "expired"
    : invitation.status;

export const invitationLabels = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
} as const;

export const canInviteTo = (campaign: ClientOutput<"campaigns.get">, now = Date.now()) =>
  campaign.state === "FUNDED_ACTIVE" && Date.parse(campaign.endsAt) > now;
