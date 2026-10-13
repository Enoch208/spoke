"use client";

import { useState } from "react";
import Link from "next/link";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useClientQuery } from "@/lib/query/use-client";
import { useInvitationsRespondMutation } from "@/lib/query/hooks/invitations";
import { routeTo } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { formatDateTime } from "@/lib/format";
import { PolicySummary } from "../shared/policy";
import { DialogError, DialogSkeleton } from "../shared/dialog-states";
import { invitationStatus, invitationLabels, canInviteTo } from "./model";

export default function ReviewInvitation({ props, isTop, close }: ModalComponentProps<"M-46">) {
  const invitation = useClientQuery(
    "invitations.get",
    { id: props.invitationId },
    { staleTime: 0, refetchInterval: 10_000 },
  );
  const item = invitation.error ? undefined : invitation.data;
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: item?.campaignId ?? "0" },
    { enabled: Boolean(item), staleTime: 0, refetchInterval: 10_000 },
  );
  const join = useClientQuery(
    "links.previewJoin",
    { campaignId: item?.campaignId ?? "0" },
    { enabled: Boolean(item), staleTime: 0 },
  );
  const respond = useInvitationsRespondMutation();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const status = item ? invitationStatus(item) : null;
  const signer = useSessionStore((state) => state.address);
  const invitedWallet = Boolean(item && signer?.toLowerCase() === item.distributor.toLowerCase());
  const active = campaign.data && !campaign.error && canInviteTo(campaign.data);
  const continueJoining = () => {
    if (!item || !invitedWallet) return;
    close();
    const nodeId = join.data?.eligibility === "already_joined" ? join.data.nodeId : null;
    if (nodeId) useUiStore.getState().open("M-13", { nodeId });
    else
      useUiStore.getState().open("M-12", {
        campaignId: item.campaignId,
        ...(item.parentNodeId ? { parentNodeId: item.parentNodeId } : {}),
      });
  };
  const reply = (response: "accept" | "decline", createLink = true) => {
    respond.mutate(
      { id: props.invitationId, response, ...(response === "decline" && reason ? { reason } : {}) },
      {
        onSuccess: () => {
          if (response === "accept" && createLink) continueJoining();
          else close();
          useUiStore.getState().pushToast({
            id: "T-02",
            tone: "success",
            message:
              response === "accept"
                ? "Invitation accepted. Create your link to join."
                : "Invitation declined",
            durationMs: 4000,
          });
        },
      },
    );
  };
  return (
    <Dialog
      open
      size="md"
      inert={!isTop}
      title="Campaign invitation"
      onOpenChange={(open) => {
        if (!open && !respond.isPending) close();
      }}
      footer={
        <>
          {status === "pending" ? (
            <>
              <Button
                variant="secondary"
                disabled={respond.isPending}
                onClick={() => {
                  if (declining) reply("decline");
                  else setDeclining(true);
                }}
              >
                {declining ? "Confirm decline" : "Decline"}
              </Button>
              {!declining ? (
                <Button
                  disabled={!active || !invitedWallet || join.isPending || Boolean(join.error)}
                  loading={respond.isPending}
                  onClick={() => {
                    reply("accept");
                  }}
                >
                  Accept and create my link
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  disabled={respond.isPending}
                  onClick={() => {
                    setDeclining(false);
                  }}
                >
                  Keep invitation
                </Button>
              )}
            </>
          ) : status === "accepted" ? (
            <Button
              disabled={
                !invitedWallet ||
                join.isPending ||
                Boolean(join.error) ||
                (!active && join.data?.eligibility !== "already_joined")
              }
              onClick={continueJoining}
            >
              {join.data?.eligibility === "already_joined" ? "Open my link" : "Create my link"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          )}
        </>
      }
    >
      <div className="grid min-w-0 gap-4 wrap-anywhere">
        {invitation.isPending ? <DialogSkeleton /> : null}
        {invitation.error ? (
          <DialogError error={invitation.error} retry={() => void invitation.refetch()} />
        ) : null}
        {item ? (
          <>
            <p className="font-display text-h4">
              {campaign.data?.merchant.name ?? "A merchant"} invited you to{" "}
              {campaign.data?.product.title ?? `campaign ${item.campaignId}`}
            </p>
            <p className="text-subtle text-sm">
              {invitationLabels[invitationStatus(item)]} · Expires{" "}
              {formatDateTime(new Date(item.expiresAt))}
            </p>
            {item.message ? (
              <blockquote className="bg-soft whitespace-pre-wrap rounded-xl p-4">
                {item.message}
              </blockquote>
            ) : null}
            <div className="space-y-2">
              <h3 className="font-medium">Terms when invited</h3>
              <p className="text-body text-sm">{item.terms}</p>
            </div>
            {campaign.error ? (
              <DialogError error={campaign.error} retry={() => void campaign.refetch()} />
            ) : null}
            {campaign.data ? (
              <div className="bg-soft space-y-3 rounded-xl p-4">
                <h3 className="font-medium">Current campaign terms</h3>
                <PolicySummary version={campaign.data.policy} token={campaign.data.token} compact />
                {campaign.data.policy.policyHash !== item.policyHash ? (
                  <p className="text-amber-ink text-sm">
                    Terms have changed since this invitation. Review the current terms; each sale
                    uses the terms in force when it happens.
                  </p>
                ) : null}
              </div>
            ) : null}
            {!active && campaign.data ? (
              <p role="status">This campaign is not accepting new links right now.</p>
            ) : null}
            {!invitedWallet ? (
              <p role="status" className="text-amber-ink text-sm">
                Sign in with {item.distributor} to create the invited campaign link. You can accept
                now and return with that wallet later.
              </p>
            ) : null}
            {join.error ? (
              <DialogError error={join.error} retry={() => void join.refetch()} />
            ) : null}
            {join.data?.eligibility === "already_joined" ? (
              <p>You already have a link in this campaign.</p>
            ) : null}
            <p className="text-subtle text-sm">
              Accepting is free and does not create a link or pay rewards. Creating your link
              requires your transaction approval. You earn only from real sales that settle.
            </p>
            {declining ? (
              <Field label="Reason" optional>
                <Textarea
                  maxLength={300}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                />
              </Field>
            ) : null}
            {status === "pending" && !declining ? (
              <Button
                variant="ghost"
                disabled={!active || respond.isPending}
                onClick={() => {
                  reply("accept", false);
                }}
              >
                Accept now, create my link later
              </Button>
            ) : null}
            <Link
              className="text-sm underline"
              href={routeTo.campaign(item.campaignId)}
              onClick={close}
            >
              View campaign
            </Link>
          </>
        ) : null}
        {respond.error ? (
          <p role="alert" className="text-pink-ink">
            {respond.error.message}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
