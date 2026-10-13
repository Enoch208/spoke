"use client";

import { useRef, useState } from "react";
import { zeroHash } from "viem";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { ModeBadge } from "@/components/ui/mode-badge";
import { useCopy } from "@/components/ui/use-copy";
import { useClientContext } from "@/lib/client/provider";
import { common, fill, toasts, txOverallStatus } from "@/lib/copy";
import { formatDuration } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { personLabel } from "@/components/graph/person";
import { createLinkCopy } from "../copy/links";
import { DialogError, DialogSkeleton } from "../shared/dialog-states";
import { FeeLine } from "../shared/fee-line";
import { closeSheetFor, useStartTx } from "../shared/use-start";
import { useTxOutcome, useTxStatus } from "../shared/use-tx-outcome";
import { CreateLinkSplit } from "./create-link-split";
import { CreateLinkHeader, eligibilityNotice } from "./create-link-parts";

export default function CreateLinkDialog({ props, isTop, close }: ModalComponentProps<"M-12">) {
  const { mode } = useClientContext();
  const open = useUiStore((state) => state.open);
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const start = useStartTx();
  const copy = useCopy();
  const primary = useRef<HTMLButtonElement>(null);
  const [parent, setParent] = useState(props.parentNodeId);
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const status = useTxStatus(txId);
  const consent = useRef<HTMLDivElement>(null);
  useTxOutcome(txId, (record) => {
    closeSheetFor(record.id);
    close();
    const nodeId = record.context.nodeId;
    if (nodeId) open("M-13", { nodeId });
  });
  const campaign = useClientQuery("campaigns.get", { campaignId: props.campaignId });
  const preview = useClientQuery(
    "links.previewJoin",
    { campaignId: props.campaignId, ...(parent && parent !== "0" ? { parent } : {}) },
    { enabled: signedIn },
  );
  const invitations = useClientQuery(
    "invitations.mine",
    { status: "pending" },
    { enabled: signedIn && preview.data?.eligibility === "invitation_required" },
  );
  const data = campaign.data;
  const join = preview.data;
  const version = join?.policy ?? data?.policy;
  const merchant = data?.merchant.name ?? "";
  const invitation = invitations.data?.items.find((item) => item.campaignId === props.campaignId);
  const above = join?.ancestorsAbove ?? [];
  const nearestAbove = above[0];
  const notice =
    join && data ? eligibilityNotice(join, merchant, Boolean(parent && parent !== "0")) : null;
  const create = () => {
    setTried(true);
    if (!agreed || !data) {
      consent.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    const started = start("createNode", {
      campaignId: props.campaignId,
      campaignName: data.product.title,
      parentNodeId: parent && parent !== "0" ? parent : "0",
      metadataHash: zeroHash,
    });
    setTxId(started);
  };

  const footerAction = () => {
    if (!signedIn)
      return (
        <Button
          ref={primary}
          onClick={() => {
            close();
            open("M-01", { reason: "share", subject: data?.product.title ?? "" });
          }}
        >
          {createLinkCopy.signIn}
        </Button>
      );
    if (!join || !data) return <Button disabled>{createLinkCopy.primary}</Button>;
    if (join.eligibility === "already_joined" && join.nodeId)
      return (
        <Button ref={primary} onClick={() => open("M-13", { nodeId: join.nodeId ?? "" })}>
          {createLinkCopy.openShareKit}
        </Button>
      );
    if (join.eligibility === "is_merchant")
      return (
        <Button
          ref={primary}
          onClick={() =>
            void copy(
              `${window.location.origin}${routeTo.campaign(props.campaignId)}`,
              toasts["T-01"].copy.link,
            )
          }
        >
          {createLinkCopy.copyCampaign}
        </Button>
      );
    if (join.eligibility === "invitation_required")
      return invitation ? (
        <Button ref={primary} onClick={() => open("M-46", { invitationId: invitation.id })}>
          {createLinkCopy.seeInvitation}
        </Button>
      ) : null;
    if (join.eligibility === "invalid_parent")
      return (
        <Button
          ref={primary}
          onClick={() => {
            setParent(undefined);
          }}
        >
          {createLinkCopy.fromCampaign}
        </Button>
      );
    const blocked = join.eligibility !== "ok";
    return (
      <Button
        ref={primary}
        disabled={blocked}
        loading={txId !== null}
        loadingLabel={status ? txOverallStatus[status] : createLinkCopy.creating}
        onClick={create}
      >
        {createLinkCopy.primary}
      </Button>
    );
  };

  const ready = join?.eligibility === "ok";
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="md"
      bodyClassName="min-w-0"
      inert={!isTop}
      initialFocus={primary}
      title={createLinkCopy.title}
      badge={<ModeBadge mode={mode} />}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {common.cancel}
          </Button>
          {footerAction()}
        </>
      }
    >
      {campaign.isPending ? <DialogSkeleton /> : null}
      {campaign.error ? (
        <DialogError error={campaign.error} retry={() => void campaign.refetch()} />
      ) : null}
      {preview.error ? (
        <DialogError error={preview.error} retry={() => void preview.refetch()} />
      ) : null}
      {data ? (
        <div className="grid min-w-0 grid-cols-1 gap-4 wrap-anywhere">
          <CreateLinkHeader campaign={data} demo={mode === "demo"} />
          {notice ? <div className="grid gap-1">{notice}</div> : null}
          {ready || !join ? (
            <p className="text-body">
              {nearestAbove
                ? fill(createLinkCopy.bodyParent, {
                    parentHandle: personLabel(nearestAbove.creator),
                    above: String(Math.max(0, (version?.maxRewardedAncestors ?? 1) - 1)),
                  })
                : fill(createLinkCopy.bodyRoot, { product: data.product.title, merchant })}
            </p>
          ) : null}
          {version && (ready || !join) ? (
            <CreateLinkSplit
              version={version}
              price={BigInt(data.price)}
              token={data.token}
              merchant={merchant}
              pathLength={above.length + 1}
            />
          ) : null}
          {version && ready ? (
            <p className="text-body text-sm">
              {fill(createLinkCopy.settlement, { hold: formatDuration(version.holdSeconds) })}
            </p>
          ) : null}
          {ready ? <p className="text-subtle text-sm">{createLinkCopy.rules}</p> : null}
          {ready ? (
            <div ref={consent} className="grid gap-1">
              <Checkbox
                checked={agreed}
                onCheckedChange={setAgreed}
                label={createLinkCopy.consent}
              />
              {tried && !agreed ? (
                <p role="alert" className="text-pink-ink text-sm">
                  {createLinkCopy.consentError}
                </p>
              ) : null}
            </div>
          ) : null}
          {ready ? <FeeLine /> : null}
        </div>
      ) : null}
    </Dialog>
  );
}
