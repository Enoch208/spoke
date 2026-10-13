"use client";

import { useState } from "react";
import Link from "next/link";
import { walletAddress } from "@spoke/protocol";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { PolicySummary, rateLine } from "@/components/earn/shared/policy";
import { DialogError } from "@/components/earn/shared/dialog-states";
import { canInviteTo } from "@/components/earn/invitations/model";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientQuery } from "@/lib/query/use-client";
import { useInvitationsSendMutation } from "@/lib/query/hooks/invitations";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";

export default function InviteDialog({ props, close, isTop }: ModalComponentProps<"M-28">) {
  const [address, setAddress] = useState(props.address);
  const [campaignId, setCampaignId] = useState(props.campaignId ?? "");
  const [message, setMessage] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [days, setDays] = useState("7");
  const campaigns = useClientQuery("campaigns.mine", { limit: 100, ...(cursor ? { cursor } : {}) });
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: campaignId || "0" },
    { enabled: Boolean(campaignId), staleTime: 0 },
  );
  const validAddress = walletAddress.safeParse(address.trim()).success;
  const profile = useClientQuery(
    "reputation.get",
    { addressOrHandle: address.trim() },
    { enabled: validAddress },
  );
  const person = profile.data && !("hidden" in profile.data) ? profile.data : null;
  const send = useInvitationsSendMutation();
  const data = campaign.data;
  const ready =
    validAddress &&
    data &&
    canInviteTo(data) &&
    !campaign.error &&
    person?.acceptsInvitations !== false;
  const dismiss = () => {
    if (send.isPending) return;
    if (message.trim())
      useUiStore.getState().open("M-43", { subject: "invitation message", onContinue: close });
    else close();
  };
  const submit = () => {
    if (!ready) return;
    send.mutate(
      {
        distributor: address.trim(),
        campaignId,
        message,
        terms: rateLine(data.policy, data.token),
        expiresAt: new Date(
          Math.min(Date.now() + Number(days) * 86400000, Date.parse(data.endsAt)),
        ).toISOString(),
      },
      {
        onSuccess: () => {
          useUiStore.getState().pushToast({
            id: "T-32",
            tone: "success",
            message: "Invitation sent",
            durationMs: 4000,
          });
          close();
        },
      },
    );
  };
  return (
    <Dialog
      open
      inert={!isTop}
      size="md"
      title="Invite a distributor"
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
      footer={
        <>
          <Button variant="secondary" disabled={send.isPending} onClick={dismiss}>
            Cancel
          </Button>
          <Button disabled={!ready} loading={send.isPending} onClick={submit}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="grid min-w-0 gap-5 wrap-anywhere">
        <Field
          label="Distributor wallet"
          helper={
            person?.displayName ??
            person?.handle ??
            "Use the distributor's registered wallet. They must have enabled invitations."
          }
        >
          <Input
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
            }}
            placeholder="0x…"
            readOnly={Boolean(props.address)}
          />
        </Field>
        {person?.acceptsInvitations === false ? (
          <p role="status" className="text-amber-ink">
            This distributor is not accepting invitations right now.
          </p>
        ) : null}
        <Field label="Campaign">
          <Select
            value={campaignId}
            onValueChange={setCampaignId}
            placeholder="Choose a campaign"
            options={(campaigns.data?.items ?? []).flatMap((item) =>
              item.campaignId
                ? [
                    {
                      value: item.campaignId,
                      label: item.productTitle,
                      disabled: item.state !== "FUNDED_ACTIVE",
                    },
                  ]
                : [],
            )}
          />
        </Field>
        {campaigns.error ? (
          <DialogError error={campaigns.error} retry={() => void campaigns.refetch()} />
        ) : null}
        {campaigns.data?.nextCursor ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCursor(campaigns.data.nextCursor ?? undefined);
            }}
          >
            Next campaigns
          </Button>
        ) : null}
        {cursor ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCursor(undefined);
            }}
          >
            First campaigns
          </Button>
        ) : null}
        {campaigns.data?.items.length === 0 ? (
          <p>
            You have no campaigns on this page.{" "}
            <Link className="underline" href={routes.sell.newCampaign} onClick={close}>
              Create a campaign
            </Link>
          </p>
        ) : null}
        {campaign.error ? (
          <DialogError error={campaign.error} retry={() => void campaign.refetch()} />
        ) : null}
        {data ? (
          <div aria-live="polite" className="bg-soft rounded-2xl p-4">
            <PolicySummary version={data.policy} token={data.token} compact />
            <p className="text-subtle mt-3 text-xs">
              Amounts are in testnet demo tokens. Current terms will be checked again before
              sending.
            </p>
          </div>
        ) : null}
        {data && !canInviteTo(data) ? (
          <p role="status">This campaign is not accepting invitations right now.</p>
        ) : null}
        <Field label="Message" optional helper={`${String(message.length)} / 500 characters`}>
          <Textarea
            value={message}
            maxLength={500}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            placeholder="Why this campaign fits the people they share with…"
          />
        </Field>
        <Field label="Invitation expires">
          <Select
            value={days}
            onValueChange={setDays}
            options={[
              { value: "3", label: "In 3 days" },
              { value: "7", label: "In 7 days" },
              { value: "30", label: "In 30 days" },
            ]}
          />
        </Field>
        <p className="text-subtle text-sm">
          Expires sooner if the campaign ends. Invitations do not pay anything by themselves.
          Rewards come only from real sales that settle.
        </p>
        {send.error ? <DialogError error={send.error} retry={submit} /> : null}
      </div>
    </Dialog>
  );
}
