"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/copy";
import { formatAmount, formatDateTime, formatRelative } from "@/lib/format";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { overallStatus } from "@/lib/tx/records";
import { useChainAction } from "@/lib/tx/use-action";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { refundCopy as copy } from "../copy/dialogs";
import { Callout } from "../shared/callout";
import { useIsDemo, useOwnsCampaign } from "../shared/hooks";
import { DialogBadge, DialogSkeleton, FeeNote } from "./parts";
import { RefundSummary } from "./refund-summary";
import { openFinalize } from "../shared/settle";

const defaultReply = "Refunded under the published refund terms.";

export default function RefundModal({ props, isTop, close }: ModalComponentProps<"M-22">) {
  const now = useNow();
  const demo = useIsDemo();
  const start = useChainAction();
  const cancel = useRef<HTMLButtonElement>(null);
  const receipt = useClientQuery("receipts.get", { saleId: props.saleId, chainId: activeChain.id });
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: receipt.data?.campaignId ?? "0" },
    { enabled: Boolean(receipt.data) },
  );
  const dispute = useClientQuery(
    "disputes.get",
    { id: props.disputeId ?? "none" },
    { enabled: Boolean(props.disputeId) },
  );
  const respond = useClientMutation("disputes.respond", ["disputes", "receipts"]);
  const owns = useOwnsCampaign(campaign.data?.merchant.slug);
  const [confirmed, setConfirmed] = useState(false);
  const [tried, setTried] = useState(false);
  const [reply, setReply] = useState("");
  const [running, setRunning] = useState(false);
  const watch = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      watch.current?.();
    },
    [],
  );
  const sendReply = () => {
    if (!props.disputeId) return;
    respond.mutate(
      { id: props.disputeId, outcome: "refunded", message: reply.trim() || defaultReply },
      { onSuccess: close },
    );
  };
  const follow = (since: number) => {
    watch.current?.();
    watch.current = useTxStore.subscribe((state) => {
      const record = state.records.find(
        (candidate) =>
          candidate.resumeKey === `refund:${props.saleId}` && candidate.updatedAt >= since,
      );
      if (!record) return;
      const status = overallStatus(record);
      if (status === "done" || status === "already_done") {
        watch.current?.();
        watch.current = null;
        sendReply();
      } else if (status === "rejected" || status === "failed" || status === "expired") {
        watch.current?.();
        watch.current = null;
        setRunning(false);
      }
    });
  };
  const data = receipt.data;
  const token = data?.token;
  const unlock = data ? Date.parse(data.unlockAt) : 0;
  const secondsLeft = Math.max(0, Math.floor((unlock - now) / 1000));
  const pending = data?.state === "PENDING";
  const windowOpen = pending && now < unlock;
  const replyTooLong = reply.length > 1000;
  const dismiss = () => {
    if (!reply.trim() || running) {
      close();
      return;
    }
    useUiStore.getState().open("M-43", { subject: copy.discardSubject, onContinue: close });
  };
  const refund = () => {
    setTried(true);
    if (!confirmed || replyTooLong || !data) return;
    if (props.disputeId) {
      setRunning(true);
      follow(Date.now());
    } else close();
    start("refund", { saleId: props.saleId, price: data.price });
  };
  const loading = receipt.isPending || (Boolean(data) && (campaign.isPending || owns === null));
  const blocked = !loading && (!owns || !windowOpen);
  return (
    <Dialog
      open
      size="md"
      role="alertdialog"
      inert={!isTop}
      initialFocus={cancel}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
      title={fill(copy.title, { saleId: props.saleId })}
      badge={<DialogBadge />}
      footer={
        <>
          <Button ref={cancel} variant="secondary" onClick={dismiss}>
            {blocked ? "Close" : "Cancel"}
          </Button>
          {!loading && owns && pending && !windowOpen ? (
            <Button
              onClick={() => {
                close();
                openFinalize([props.saleId]);
              }}
            >
              {copy.finalizeInstead}
            </Button>
          ) : null}
          {!blocked && !loading && data && token ? (
            <Button variant="danger" loading={running} onClick={refund}>
              {fill(copy.primary, { price: formatAmount(BigInt(data.price), token) })}
            </Button>
          ) : null}
        </>
      }
    >
      {loading || !data || !token ? (
        receipt.error ? (
          <ErrorState variant="inline" title={receipt.error.message} />
        ) : (
          <DialogSkeleton />
        )
      ) : !owns ? (
        <Callout tone="caution">{copy.notMerchant}</Callout>
      ) : data.state === "REFUNDED" ? (
        <Callout tone="info">
          {fill(copy.refunded, {
            time: data.refundTx?.at ? formatDateTime(new Date(data.refundTx.at)) : "",
          })}
        </Callout>
      ) : data.state === "FINALIZED" ? (
        <Callout tone="info">{copy.finalized}</Callout>
      ) : !windowOpen ? (
        <Callout tone="caution">
          {fill(copy.closed, { unlockAt: formatDateTime(new Date(data.unlockAt)) })}
        </Callout>
      ) : (
        <div className="space-y-5">
          <Badge tone="amber">
            {fill(copy.closes, {
              relative: formatRelative(new Date(unlock), { now: new Date(now) }),
            })}
          </Badge>
          <RefundSummary
            receipt={data}
            productTitle={campaign.data?.product.title ?? ""}
            demo={demo}
          />
          {props.disputeId && dispute.data ? (
            <div className="bg-soft space-y-1 rounded-xl px-4 py-3 text-sm">
              <p className="text-subtle">{copy.reason}</p>
              <p className="text-ink font-medium">{dispute.data.reason}</p>
              <p className="text-body">{dispute.data.message}</p>
            </div>
          ) : null}
          {props.disputeId ? (
            <Field
              label={copy.reply}
              optional
              helper={copy.replyHelper}
              error={replyTooLong ? copy.replyError : undefined}
            >
              <Textarea
                value={reply}
                rows={3}
                onChange={(event) => {
                  setReply(event.target.value);
                }}
              />
            </Field>
          ) : null}
          <Callout tone="caution">{copy.caution}</Callout>
          {secondsLeft < 60 ? (
            <Callout tone="danger">{fill(copy.tight, { seconds: String(secondsLeft) })}</Callout>
          ) : null}
          <Checkbox checked={confirmed} onCheckedChange={setConfirmed} label={copy.confirm} />
          {tried && !confirmed ? (
            <p role="alert" className="text-pink-ink text-sm">
              {copy.confirmError}
            </p>
          ) : null}
          {respond.isError ? (
            <Callout
              tone="danger"
              action={
                <Button size="sm" variant="secondary" onClick={sendReply}>
                  {copy.sendAgain}
                </Button>
              }
            >
              {copy.replyFailed}
            </Callout>
          ) : null}
          <FeeNote />
        </div>
      )}
    </Dialog>
  );
}
