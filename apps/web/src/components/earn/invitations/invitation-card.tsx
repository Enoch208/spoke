"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateTime, shortAddress } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { useClientQuery } from "@/lib/query/use-client";
import { useInvitationsWithdrawMutation } from "@/lib/query/hooks/invitations";
import { useUiStore } from "@/lib/stores/ui";
import { ConfirmPopover } from "@/components/sell/growth/shared/confirm";
import { invitationStatus, invitationLabels, type Invitation } from "./model";

export function InvitationCard({
  invitation,
  sent = false,
}: {
  invitation: Invitation;
  sent?: boolean;
}) {
  const campaign = useClientQuery("campaigns.get", { campaignId: invitation.campaignId });
  const withdraw = useInvitationsWithdrawMutation();
  const status = invitationStatus(invitation);
  return (
    <Card className="grid min-w-0 gap-4 wrap-anywhere">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-subtle text-sm">
            {sent
              ? `To ${shortAddress(invitation.distributor)}`
              : (campaign.data?.merchant.name ?? "Campaign invitation")}
          </p>
          <h2 className="font-display text-h4">
            {campaign.data?.product.title ?? `Campaign ${invitation.campaignId}`}
          </h2>
        </div>
        <Badge>{invitation.joinedNodeId ? "Joined" : invitationLabels[status]}</Badge>
      </div>
      {invitation.message ? (
        <p className="text-body whitespace-pre-wrap">{invitation.message}</p>
      ) : null}
      <p className="text-subtle text-sm">
        Sent {formatDateTime(new Date(invitation.createdAt))} · Expires{" "}
        {formatDateTime(new Date(invitation.expiresAt))}
      </p>
      {status === "accepted" ? (
        <p className="text-sm">
          {invitation.joinedNodeId
            ? "Campaign link confirmed and indexed."
            : "Accepted. Joining is complete when the distributor creates their campaign link."}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!sent ? (
          <Button
            onClick={() => useUiStore.getState().open("M-46", { invitationId: invitation.id })}
          >
            {status === "pending"
              ? "Review and accept"
              : invitation.joinedNodeId
                ? "Open my link"
                : status === "accepted"
                  ? "Create my link"
                  : "View invitation"}
          </Button>
        ) : null}
        {sent && status === "pending" ? (
          <ConfirmPopover
            title="Withdraw this invitation?"
            body="The distributor will no longer be able to accept it."
            confirmLabel="Withdraw invitation"
            cancelLabel="Keep invitation"
            trigger={
              <Button variant="secondary" loading={withdraw.isPending}>
                Withdraw
              </Button>
            }
            onConfirm={() => {
              withdraw.mutate({ id: invitation.id });
            }}
          />
        ) : null}
        <Button asChild variant="secondary">
          <Link href={routeTo.campaign(invitation.campaignId)}>View campaign</Link>
        </Button>
        {sent && invitation.joinedNodeId ? (
          <Button asChild variant="ghost">
            <Link href={`/sell/campaigns/${invitation.campaignId}?tab=distributors`}>
              View campaign distributors
            </Link>
          </Button>
        ) : null}
      </div>
      {withdraw.error ? (
        <p role="alert" className="text-pink-ink text-sm">
          {withdraw.error.message}
        </p>
      ) : null}
    </Card>
  );
}
