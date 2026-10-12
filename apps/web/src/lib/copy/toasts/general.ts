import type { ToastCopy, ToastId } from "./shape";

export const generalToasts = {
  "T-01": {
    name: "Copied",
    copy: {
      thing: "{thing} copied",
      link: "Link copied",
      address: "Address copied",
      caption: "Caption copied",
      hash: "Hash copied",
      key: "Key copied",
      json: "JSON copied",
      captionForApp: "Caption copied. Paste it in {app}.",
    },
    duration: 2000,
    actions: [],
  },
  "T-02": {
    name: "Saved",
    copy: {
      thing: "{thing} saved",
      template: "Template saved",
      signerAdded: "Signer added",
      signerRevoked: "Signer revoked",
      invitationDeclined: "Invitation declined",
      caseUpdated: "Case updated",
      preferences: "Preferences saved",
    },
    duration: 3000,
    actions: [],
  },
  "T-03": { name: "Draft saved", copy: "Draft saved", duration: 3000, actions: [] },
  "T-04": {
    name: "Offline",
    copy: "You’re offline. Changes and transactions will wait until you’re back.",
    duration: "untilOnline",
    actions: [],
  },
  "T-05": { name: "Back online", copy: "You’re back online.", duration: 3000, actions: [] },
  "T-06": {
    name: "Request failed",
    copy: "Couldn’t {verb}. {reason}",
    duration: "sticky",
    actions: ["Try again", "Report"],
  },
  "T-07": {
    name: "Signed in",
    copy: { signedIn: "Signed in as {name}", created: "Account created" },
    duration: 3000,
    actions: [],
  },
  "T-08": { name: "Signed out", copy: "Signed out", duration: 3000, actions: [] },
  "T-09": {
    name: "Signed in again",
    copy: "You’re signed in again.",
    duration: 3000,
    actions: [],
  },
  "T-10": {
    name: "Network switched",
    copy: "Switched to Monad Testnet",
    duration: 3000,
    actions: [],
  },
  "T-11": {
    name: "Mode changed",
    copy: { demo: "Demo mode on · sample data", live: "Back to live testnet data" },
    duration: 4000,
    actions: [],
  },
  "T-12": {
    name: "Demo reset",
    copy: "Demo reset to its starting point",
    duration: 4000,
    actions: [],
  },
} as const satisfies Record<ToastId, ToastCopy>;
