"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useClientMutation } from "@/lib/query/use-client";
import type { ModalComponentProps } from "@/components/app/modal-types";

export default function ReportModal({ props, close }: ModalComponentProps<"M-41">) {
  const page = usePathname();
  const report = useClientMutation("support.report", []);
  const [message, setMessage] = useState("");
  return (
    <Dialog
      open
      title={report.data ? "Report received" : "Report an issue"}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={
        report.data ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <Button
            loading={report.isPending}
            disabled={message.trim().length < 20}
            onClick={() => {
              report.mutate({
                category: "payment",
                message,
                context: { page },
                ...(props.target
                  ? { target: { kind: props.target.kind, id: props.target.id } }
                  : {}),
              });
            }}
          >
            Send report
          </Button>
        )
      }
    >
      <p className="text-body">
        Include your sale number, transaction hash or request ID. Never include a private key or
        recovery phrase.
      </p>
      {report.data ? (
        <p className="mt-4" role="status">
          Ticket {report.data.ticketId}
        </p>
      ) : (
        <Field label="What happened?" className="mt-4">
          <Textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            minLength={20}
            maxLength={5000}
            rows={5}
          />
        </Field>
      )}
      {report.error ? (
        <p className="text-pink-ink mt-3" role="alert">
          {report.error.message}
        </p>
      ) : null}
    </Dialog>
  );
}
