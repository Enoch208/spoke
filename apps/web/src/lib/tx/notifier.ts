import { fill, toasts, type ToastDuration } from "@/lib/copy";
import type { ToastInput } from "@/lib/stores/ui";
import { doneToast, type DoneToastAction } from "./done-toast";
import type { TxEvent } from "./engine";
import { txErrorText } from "./error-copy";
import { txLabel } from "./labels";
import { failureStep } from "./records";
import type { AnyTxRecord } from "./types";

export type NotifierDeps = {
  push: (toast: ToastInput) => void;
  dismiss: (id: `T-${string}`, subject: string) => void;
  markNoticeShown: (recordId: string) => void;
  show: (recordId: string) => void;
  showList: () => void;
  retry: (recordId: string) => void;
  continueRun: (recordId: string) => void;
  report: (record: AnyTxRecord) => void;
  runDoneAction: (record: AnyTxRecord, action: DoneToastAction) => void;
  viewingDemo: () => boolean;
};

export const durationMs = (duration: ToastDuration): number | null =>
  typeof duration === "number" ? duration : null;

const transientIds = ["T-20", "T-21", "T-22", "T-26"] as const;

export const notifyTxEvent = (event: TxEvent, deps: NotifierDeps) => {
  const { record } = event;
  const subject = record.id;
  const label = txLabel(record);
  const hidden = record.hiddenAt !== null;
  const liveInDemo = record.mode === "live" && deps.viewingDemo();
  const show = {
    label: toasts["T-20"].actions[0],
    run: () => {
      deps.show(subject);
    },
  };
  const base = { subject, liveInDemo };
  const clearTransient = () => {
    for (const id of transientIds) deps.dismiss(id, subject);
  };

  switch (event.type) {
    case "hidden":
      if (record.backgroundNoticeShown) return;
      deps.markNoticeShown(subject);
      deps.push({
        ...base,
        id: "T-20",
        tone: "info",
        message: fill(toasts["T-20"].copy, { label }),
        action: show,
        durationMs: durationMs(toasts["T-20"].duration),
      });
      return;
    case "walletWaiting": {
      const wallet = record.context.walletName;
      if (!hidden || !wallet) return;
      deps.push({
        ...base,
        id: "T-21",
        tone: "info",
        message: fill(toasts["T-21"].copy, { label, wallet }),
        action: show,
        durationMs: null,
      });
      return;
    }
    case "sent":
      deps.dismiss("T-21", subject);
      return;
    case "syncing":
      if (!hidden) return;
      deps.push({
        ...base,
        id: "T-22",
        tone: "info",
        message: fill(toasts["T-22"].copy, { label }),
        action: show,
        durationMs: durationMs(toasts["T-22"].duration),
      });
      return;
    case "done": {
      clearTransient();
      if (!hidden) return;
      const done = doneToast(record);
      const { action, actionLabel } = done;
      deps.push({
        ...base,
        id: "T-23",
        tone: "success",
        message: done.message,
        ...(action && actionLabel
          ? {
              action: {
                label: actionLabel,
                run: () => {
                  deps.runDoneAction(record, action);
                },
              },
            }
          : {}),
        durationMs: durationMs(toasts["T-23"].duration),
      });
      return;
    }
    case "rejected":
      clearTransient();
      if (!hidden) return;
      deps.push({
        ...base,
        id: "T-24",
        tone: "info",
        message: fill(toasts["T-24"].copy, { label }),
        action: {
          label: toasts["T-24"].actions[0],
          run: () => {
            deps.retry(subject);
          },
        },
        durationMs: durationMs(toasts["T-24"].duration),
      });
      return;
    case "failed": {
      clearTransient();
      if (!hidden) return;
      const error = failureStep(record)?.error;
      const reason = error ? txErrorText(error).body : "";
      const [details, report] = toasts["T-25"].actions;
      deps.push({
        ...base,
        id: "T-25",
        tone: "error",
        message: fill(toasts["T-25"].copy, { label, reason }),
        action: {
          label: details,
          run: () => {
            deps.show(subject);
          },
        },
        secondaryAction: {
          label: report,
          run: () => {
            deps.report(record);
          },
        },
        durationMs: null,
      });
      return;
    }
    case "unknown":
      if (!hidden) return;
      deps.push({
        ...base,
        id: "T-26",
        tone: "info",
        message: fill(toasts["T-26"].copy, { label }),
        action: show,
        durationMs: null,
      });
      return;
    case "replaced": {
      clearTransient();
      if (!hidden) return;
      const reason = failureStep(record)?.replacedReason ?? "replaced";
      const variant = reason === "replaced" ? "other" : reason;
      deps.push({
        ...base,
        id: "T-27",
        tone: "info",
        message: fill(toasts["T-27"].copy[variant], { label }),
        action: show,
        durationMs: durationMs(toasts["T-27"].duration[variant]),
      });
      return;
    }
    case "resumed": {
      const count = event.count ?? 1;
      deps.push({
        ...base,
        subject: "resumed",
        id: "T-28",
        tone: "info",
        message:
          count === 1
            ? toasts["T-28"].copy.one
            : fill(toasts["T-28"].copy.many, { n: String(count) }),
        action: {
          label: toasts["T-28"].actions[0],
          run: () => {
            if (count === 1) deps.show(subject);
            else deps.showList();
          },
        },
        durationMs: durationMs(toasts["T-28"].duration),
      });
      return;
    }
    case "interrupted":
      deps.push({
        ...base,
        id: "T-29",
        tone: "info",
        message: fill(toasts["T-29"].copy, { label }),
        action: {
          label: toasts["T-29"].actions[0],
          run: () => {
            deps.continueRun(subject);
          },
        },
        durationMs: null,
      });
      return;
  }
};
