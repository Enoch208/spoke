"use client";

import { useState } from "react";
import type { ClientOutput } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { useClientMutation } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { declineCopy, saleDetailCopy as copy, salesCopy } from "../copy/sales";

type Dispute = ClientOutput<"disputes.get">;

export function RefundRequest({ dispute, canRefund }: { dispute: Dispute; canRefund: boolean }) {
  const respond = useClientMutation("disputes.respond", ["disputes", "receipts"]);
  const [declining, setDeclining] = useState(false);
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const short = message.trim().length < 10;
  return (
    <Card padding="lg" className="border-pink-soft space-y-4 border-2">
      <div>
        <h2 className="font-display text-h4 text-ink font-medium">{copy.requestTitle}</h2>
        <p className="text-subtle mt-1 text-sm">
          {fill(copy.requestTime, { time: formatDateTime(new Date(dispute.createdAt)) })}
        </p>
      </div>
      <div className="bg-soft rounded-xl px-4 py-3 text-sm">
        <p className="text-ink font-medium">{dispute.reason}</p>
        <p className="text-body mt-1 whitespace-pre-line">{dispute.message}</p>
      </div>
      {declining ? (
        <div className="space-y-3">
          <Field
            label={declineCopy.label}
            helper={declineCopy.helper}
            error={tried && short ? declineCopy.error : undefined}
          >
            <Textarea
              rows={3}
              value={message}
              maxLength={3000}
              onChange={(event) => {
                setMessage(event.target.value);
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              loading={respond.isPending}
              onClick={() => {
                setTried(true);
                if (short) return;
                respond.mutate({ id: dispute.id, outcome: "declined", message: message.trim() });
              }}
            >
              {declineCopy.send}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDeclining(false);
              }}
            >
              Cancel
            </Button>
          </div>
          {respond.error ? (
            <p role="alert" className="text-pink-ink text-sm">
              {respond.error.message}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canRefund ? (
            <Button
              variant="danger"
              onClick={() => {
                useUiStore
                  .getState()
                  .open("M-22", { saleId: dispute.saleId, disputeId: dispute.id });
              }}
            >
              {salesCopy.refund}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              setDeclining(true);
            }}
          >
            {copy.decline}
          </Button>
        </div>
      )}
    </Card>
  );
}
