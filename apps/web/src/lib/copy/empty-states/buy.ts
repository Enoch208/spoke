import type { EmptyStateCopy } from "./shape";

export const buyEmptyStates = {
  "ES-30": {
    list: "My purchases (BUY-02)",
    title: "No purchases yet",
    body: "Things you buy on Spoke appear here with their receipt, hold and access.",
    actions: ["Explore campaigns"],
    illustration: "IMG-EMPTY-PURCHASES",
  },
  "ES-31": {
    list: "Wallet activity (ACC-02)",
    title: "No activity yet",
    body: "Transactions from this account on Monad Testnet appear here.",
    actions: ["Get test funds"],
  },
  "ES-32": {
    list: "Notifications, first use (ACC-03, M-40)",
    title: "No notifications yet",
    body: "We’ll tell you about sales through your links, settled earnings and changes to campaigns you share.",
    actions: ["Notification settings"],
    illustration: "IMG-EMPTY-NOTIFICATIONS",
  },
  "ES-33": {
    list: "Notifications, all read",
    title: "You’re all caught up",
    body: "New notifications will appear here.",
  },
  "ES-34": {
    list: "Signed-in devices (ACC-05)",
    title: "No other devices",
    body: "Only this device is signed in to your account.",
  },
  "ES-35": {
    list: "Linked wallets (ACC-06)",
    title: "No other wallets linked",
    body: "Link another wallet to receive payouts there.",
    actions: ["Link a wallet"],
  },
} as const satisfies Record<string, EmptyStateCopy>;
