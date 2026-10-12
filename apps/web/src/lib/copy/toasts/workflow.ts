import type { ToastCopy, ToastId } from "./shape";

export const workflowToasts = {
  "T-30": {
    name: "Test MON arrived",
    copy: "{amount} MON arrived for network fees",
    duration: 4000,
    actions: [],
  },
  "T-31": {
    name: "Test MON failed",
    copy: "Couldn’t send test MON. {reason}",
    duration: "sticky",
    actions: ["Use the Monad faucet"],
  },
  "T-32": {
    name: "Invitation sent",
    copy: "Invitation sent to {name}",
    duration: 4000,
    actions: [],
  },
  "T-33": {
    name: "Invitation accepted",
    copy: "Invitation accepted. Create your link next.",
    duration: 4000,
    actions: [],
  },
  "T-34": {
    name: "Refund requested",
    copy: "Refund request sent to {merchant}",
    duration: 4000,
    actions: [],
  },
  "T-35": {
    name: "Report sent",
    copy: "Report sent · reference {ticketId}",
    duration: 6000,
    actions: ["Copy reference"],
  },
  "T-36": {
    name: "Export ready",
    copy: { export: "Your export is ready", record: "Record downloaded" },
    duration: 8000,
    actions: ["Download"],
  },
  "T-37": { name: "Upload complete", copy: "{filename} uploaded", duration: 3000, actions: [] },
  "T-38": {
    name: "Recovery backed up",
    copy: "Recovery phrase backed up",
    duration: 4000,
    actions: [],
  },
  "T-39": {
    name: "Quick actions",
    copy: {
      on: "Quick actions on for this device",
      off: "Quick actions off",
      idle: "Quick actions ended after 15 minutes without activity. Your passkey starts them again.",
    },
    duration: { on: 4000, off: 4000, idle: 6000 },
    actions: [],
  },
  "T-40": {
    name: "New activity",
    copy: { bundled: "{n} new notifications" },
    duration: 6000,
    actions: ["View"],
    perNotification: true,
  },
  "T-41": {
    name: "Checkout resumed",
    copy: "Picking up your checkout where you left off",
    duration: 4000,
    actions: ["Start over"],
  },
  "T-42": {
    name: "Visibility updated",
    copy: {
      public: "Your profile is now Public",
      pseudonymous: "Your profile is now Pseudonymous",
      private: "Your profile is now Private",
    },
    duration: 4000,
    actions: [],
  },
  "T-43": {
    name: "Account deleted",
    copy: "Your Spoke account was deleted",
    duration: 6000,
    actions: [],
  },
  "T-44": {
    name: "Draft restored",
    copy: "Restored your draft from {time}",
    duration: 6000,
    actions: ["Start over"],
  },
  "T-45": {
    name: "Copy blocked",
    copy: "Couldn’t copy. Select the text and copy it yourself.",
    duration: 5000,
    actions: [],
  },
  "T-46": {
    name: "Sample link copied",
    copy: "Sample link copied. It only works in demo mode in this browser.",
    duration: 5000,
    actions: [],
  },
  "T-47": {
    name: "Rate limited",
    copy: {
      withWait: "Too many requests. Try again in {seconds} s.",
      withoutWait: "Too many requests. Wait a moment and try again.",
    },
    duration: "untilWaitEnds",
    actions: [],
  },
  "T-48": { name: "QR downloaded", copy: "QR code downloaded", duration: 3000, actions: [] },
  "T-49": {
    name: "Webhook test sent",
    copy: "Test event sent. Check deliveries for the result.",
    duration: 6000,
    actions: ["View deliveries"],
  },
  "T-50": {
    name: "Key created",
    copy: "Key created. Copy it now; you won’t see it again.",
    duration: "sticky",
    actions: ["Copy key"],
  },
} as const satisfies Record<ToastId, ToastCopy>;
