import type { PerActionToast, ToastCopy, ToastId } from "./shape";

export const transactionToasts = {
  "T-20": {
    name: "Running in background",
    copy: "{label} is still running. We’ll let you know when it’s done.",
    duration: 5000,
    actions: ["Show"],
  },
  "T-21": {
    name: "Waiting for your wallet",
    copy: "Confirm {label} in {wallet}",
    duration: "untilResolved",
    actions: ["Show"],
  },
  "T-22": {
    name: "Confirmed, syncing",
    copy: "{label} confirmed onchain. We are syncing recent transactions.",
    duration: 6000,
    actions: ["Show"],
  },
  "T-23": { name: "Done", duration: 6000, perAction: true },
  "T-24": {
    name: "Cancelled",
    copy: "You cancelled {label}. Nothing was sent.",
    duration: 6000,
    actions: ["Try again"],
  },
  "T-25": {
    name: "Failed",
    copy: "{label} didn’t go through: {reason}",
    duration: "sticky",
    actions: ["Details", "Report"],
  },
  "T-26": {
    name: "Result unknown",
    copy: "We can’t see the result of {label} yet. Don’t send it again.",
    duration: "untilResolved",
    actions: ["Show"],
  },
  "T-27": {
    name: "Replaced",
    copy: {
      repriced: "Your wallet sped up {label}. Following the new transaction.",
      cancelled: "Your wallet cancelled {label}.",
      other: "Your wallet replaced {label} with a different transaction.",
    },
    duration: { repriced: 5000, cancelled: "sticky", other: "sticky" },
    actions: ["Show"],
  },
  "T-28": {
    name: "Resumed",
    copy: {
      one: "Resumed 1 transaction from before you left",
      many: "Resumed {n} transactions from before you left",
    },
    duration: 6000,
    actions: ["Show"],
  },
  "T-29": {
    name: "Interrupted",
    copy: "{label} was interrupted before it was sent. Nothing was charged.",
    duration: "sticky",
    actions: ["Continue"],
  },
} as const satisfies Record<ToastId, ToastCopy | PerActionToast>;
