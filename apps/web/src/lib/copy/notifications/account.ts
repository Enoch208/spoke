import type { NotificationCopy } from "./shape";

export const accountNotifications = {
  "N-34": {
    kind: "account.signIn",
    to: "account",
    category: "Account and security",
    title: "New sign-in",
    body: "Signed in on {device} with {method}. Not you? Sign that device out in Security.",
    opens: "ACC-05",
  },
  "N-35": {
    kind: "account.passkey",
    to: "account",
    category: "Account and security",
    titles: { added: "Passkey added", removed: "Passkey removed" },
    bodies: { added: "{label} was added {time}.", removed: "{label} was removed {time}." },
    opens: "ACC-05",
  },
  "N-36": {
    kind: "account.wallet",
    to: "account",
    category: "Account and security",
    titles: { linked: "Wallet linked", unlinked: "Wallet unlinked" },
    bodies: {
      linked: "{address} was linked to your account.",
      unlinked: "{address} was unlinked from your account.",
    },
    opens: "ACC-06",
  },
  "N-37": {
    kind: "account.payout",
    to: "account",
    category: "Account and security",
    title: "Payout address changed",
    body: "New links will pay {address}. Links you already made are unchanged.",
    opens: "ACC-06",
  },
  "N-38": {
    kind: "account.gas",
    to: "account",
    category: "Account and security",
    title: "Test MON arrived",
    body: "{amount} MON · testnet from the Spoke gas station.",
    opens: "ACC-02",
  },
} as const satisfies Record<string, NotificationCopy>;
