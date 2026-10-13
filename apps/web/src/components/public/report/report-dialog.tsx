"use client";

import { useMutation } from "@tanstack/react-query";
import type { ClientInput, ClientOutput } from "@spoke/protocol";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useClientContext } from "@/lib/client/provider";
import type { ClientError } from "@/lib/client/errors";
import { fill, toasts } from "@/lib/copy";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { activeChain } from "@/lib/wagmi";
import { Callout } from "../shared/callout";
import { reportDialogCopy } from "./report-copy";
import { ReportForm } from "./report-form";
import { detailLines, draftErrors, kindsFor, reportInput, type ReportDraft } from "./report-input";

const subscribeOnline = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

const failureCopy = (error: ClientError) => {
  if (error.code === "RATE_LIMITED") return reportDialogCopy.errors.rateLimited;
  if (error.code === "OFFLINE") return reportDialogCopy.errors.offline;
  return reportDialogCopy.errors.failed;
};

function Sent({
  ticketId,
  byEmail,
  inApp,
  demo,
}: {
  ticketId: string;
  byEmail: boolean;
  inApp: boolean;
  demo: boolean;
}) {
  return (
    <Callout tone="success">
      <p>
        {fill(reportDialogCopy.successRef, { ticketId })}{" "}
        {inApp ? reportDialogCopy.replyNotifications : byEmail ? reportDialogCopy.replyEmail : ""}
      </p>
      {demo ? <p className="mt-1">{reportDialogCopy.demoSent}</p> : null}
    </Callout>
  );
}

export default function ReportDialog({ props, close }: ModalComponentProps<"M-41">) {
  const page = usePathname();
  const { live, mode } = useClientContext();
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const open = useUiStore((state) => state.open);
  const pushToast = useUiStore((state) => state.pushToast);
  const online = useOnline();
  const inApp = mode === "live" && signedIn;
  const [draft, setDraft] = useState<ReportDraft>({
    kind: kindsFor(props.target).some((kind) => kind.value === props.category)
      ? (props.category ?? null)
      : null,
    message: "",
    email: "",
    includeDetails: true,
  });
  const [tried, setTried] = useState(false);
  const send = useMutation<
    ClientOutput<"support.report">,
    ClientError,
    ClientInput<"support.report">
  >({
    mutationFn: (input) => live.call("support.report", input),
  });
  const facts = {
    [reportDialogCopy.detailLabels.page]: page,
    [reportDialogCopy.detailLabels.mode]: mode,
    [reportDialogCopy.detailLabels.chain]: String(activeChain.id),
    [reportDialogCopy.detailLabels.browser]:
      typeof navigator === "undefined" ? "" : navigator.userAgent,
  };
  const details = detailLines(facts, props.context ?? {});
  const errors = draftErrors(draft, !inApp);
  const valid = !errors.kind && !errors.message && !errors.email;
  const ticketId = send.data?.ticketId ?? null;
  const finish = () => {
    close();
    if (!ticketId) return;
    pushToast({
      id: "T-35",
      tone: "success",
      message: fill(toasts["T-35"].copy, { ticketId }),
      durationMs: toasts["T-35"].duration,
    });
  };
  const dismiss = () => {
    if (ticketId || !draft.message.trim()) {
      finish();
      return;
    }
    open("M-43", { subject: reportDialogCopy.subjectFallback, onContinue: close });
  };
  const submit = () => {
    setTried(true);
    if (!valid || !online) return;
    send.mutate(reportInput({ draft, target: props.target, page, details, askEmail: !inApp }));
  };
  return (
    <Dialog
      open
      size="md"
      title={
        props.target
          ? fill(reportDialogCopy.titleTarget, { target: props.target.name })
          : reportDialogCopy.title
      }
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      footer={
        ticketId ? (
          <Button onClick={finish}>{reportDialogCopy.done}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={dismiss}>
              {reportDialogCopy.cancel}
            </Button>
            <Button
              loading={send.isPending}
              loadingLabel={reportDialogCopy.sending}
              disabled={!online}
              onClick={submit}
            >
              {reportDialogCopy.send}
            </Button>
          </>
        )
      }
    >
      {ticketId ? (
        <Sent
          ticketId={ticketId}
          byEmail={Boolean(draft.email.trim())}
          inApp={inApp}
          demo={mode === "demo"}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {!online ? <Callout tone="caution">{reportDialogCopy.errors.offline}</Callout> : null}
          {send.error ? <Callout tone="danger">{failureCopy(send.error)}</Callout> : null}
          <ReportForm
            draft={draft}
            onChange={setDraft}
            target={props.target}
            errors={tried ? errors : { kind: null, message: null, email: null }}
            askEmail={!inApp}
            details={details}
          />
        </div>
      )}
    </Dialog>
  );
}
