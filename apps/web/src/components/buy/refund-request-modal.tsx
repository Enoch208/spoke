"use client";

import { Clock01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SkeletonText } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { Textarea } from "@/components/ui/textarea";
import { fill, toasts } from "@/lib/copy";
import { formatAmount, formatDateTime, formatRelative } from "@/lib/format";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { refundCopy } from "./copy/modals";

type Reason = keyof typeof refundCopy.reasons;

const reasons = Object.keys(refundCopy.reasons).filter((key): key is Reason =>
  Object.hasOwn(refundCopy.reasons, key),
);

const minDetails = 20;
const maxDetails = 1000;

const statusLine = (status: string, merchant: string) =>
  status === "open"
    ? fill(refundCopy.statuses.open, { merchant })
    : status === "declined"
      ? refundCopy.statuses.declined
      : status === "refunded"
        ? refundCopy.statuses.refunded
        : refundCopy.statuses.other;

export default function RefundRequestModal({ props, close }: ModalComponentProps<"M-19">) {
  const now = useNow();
  const receipt = useClientQuery("receipts.get", { saleId: props.saleId, chainId: activeChain.id });
  const campaign = useClientQuery(
    "campaigns.get",
    { campaignId: receipt.data?.campaignId ?? "0" },
    { enabled: Boolean(receipt.data) },
  );
  const send = useClientMutation("disputes.open", ["receipts", "disputes"]);
  const [reason, setReason] = useState<Reason | undefined>(undefined);
  const [details, setDetails] = useState("");
  const [tried, setTried] = useState(false);
  const data = receipt.data;
  const merchant = campaign.data?.merchant.name ?? "";
  const length = details.trim().length;
  const reasonError = tried && !reason ? refundCopy.chooseReason : undefined;
  const detailsError =
    tried && length < minDetails
      ? refundCopy.tooShort
      : length > maxDetails
        ? refundCopy.tooLong
        : undefined;
  const dismiss = () => {
    if (details.trim() && !send.isSuccess)
      useUiStore.getState().open("M-43", { subject: refundCopy.details, onContinue: close });
    else close();
  };
  const closed = data ? now >= Date.parse(data.unlockAt) : false;
  const request = data?.refundRequest ?? null;
  const formOpen = data && data.state === "PENDING" && !closed && !request;
  const submit = () => {
    setTried(true);
    if (!reason || length < minDetails || length > maxDetails) return;
    send.mutate(
      { saleId: props.saleId, reason: refundCopy.reasons[reason], message: details.trim() },
      {
        onSuccess: () => {
          useUiStore.getState().pushToast({
            id: "T-34",
            tone: "success",
            message: fill(toasts["T-34"].copy, { merchant }),
            durationMs: toasts["T-34"].duration,
          });
          close();
        },
      },
    );
  };
  return (
    <Dialog
      open
      size="md"
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
      title={fill(refundCopy.title, { merchant: merchant || refundCopy.fallbackMerchant })}
      footer={
        formOpen ? (
          <>
            <Button variant="secondary" onClick={dismiss}>
              {refundCopy.cancel}
            </Button>
            <Button loading={send.isPending} loadingLabel={refundCopy.sending} onClick={submit}>
              {refundCopy.send}
            </Button>
          </>
        ) : (
          <Button onClick={close}>{refundCopy.close}</Button>
        )
      }
    >
      {!data ? (
        receipt.error ? (
          <p role="alert" className="text-pink-ink">
            {receipt.error.message}
          </p>
        ) : (
          <SkeletonText lines={3} />
        )
      ) : data.state === "REFUNDED" ? (
        <p className="text-body">{refundCopy.refunded}</p>
      ) : request ? (
        <p className="text-body">
          {fill(refundCopy.already, {
            time: formatRelative(new Date(request.createdAt), { now: new Date(now) }),
            status: statusLine(request.status, merchant),
          })}
        </p>
      ) : closed || data.state === "FINALIZED" ? (
        <p className="text-body">
          {fill(refundCopy.windowClosed, {
            unlockAt: formatDateTime(new Date(data.unlockAt)),
            merchant,
          })}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-body">
            {fill(refundCopy.body, {
              merchant,
              unlockAt: formatDateTime(new Date(data.unlockAt)),
              price: formatAmount(BigInt(data.price), data.token, { testnet: true }),
            })}
          </p>
          <StatusChip
            className="self-start"
            icon={Clock01Icon}
            tone="amber"
            label={fill(refundCopy.closes, {
              relative: formatRelative(new Date(data.unlockAt), { now: new Date(now) }),
            })}
          />
          <Field label={refundCopy.reason} error={reasonError}>
            <Select
              value={reason}
              onValueChange={setReason}
              placeholder={refundCopy.reasonPlaceholder}
              options={reasons.map((value) => ({ value, label: refundCopy.reasons[value] }))}
            />
          </Field>
          <Field
            label={refundCopy.details}
            helper={`${fill(refundCopy.detailsHelp, { merchant })} ${String(length)}/${String(maxDetails)}`}
            error={detailsError}
          >
            <Textarea
              value={details}
              maxLength={maxDetails + 200}
              onChange={(event) => {
                setDetails(event.target.value);
              }}
            />
          </Field>
          {send.error ? (
            <p role="alert" className="bg-pink-soft text-pink-ink rounded-xl p-3 text-sm">
              {send.error.message}
            </p>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
