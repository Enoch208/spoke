import { generalToasts } from "./general";
import type { PerActionToast, ToastCopy, ToastId } from "./shape";
import { transactionToasts } from "./transactions";
import { workflowToasts } from "./workflow";

export type { PerActionToast, ToastCopy, ToastDuration, ToastId } from "./shape";

export const toasts = {
  ...generalToasts,
  ...transactionToasts,
  ...workflowToasts,
} as const satisfies Record<ToastId, ToastCopy | PerActionToast>;
