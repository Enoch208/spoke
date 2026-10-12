import { emptyStates } from "../empty-states";
import { notificationBundles, notifications, type NotificationCopy } from "../notifications";
import type { Message } from "../types";

type Labels = Readonly<Record<string, string>>;

type FooterLink = { readonly label: string; readonly opens: string };

type NotificationsPopoverCopy = {
  readonly title: string;
  readonly bellLabel: string;
  readonly tabs: Labels;
  readonly markAllRead: string;
  readonly groups: Labels;
  readonly items: Readonly<Record<`N-${string}`, NotificationCopy>>;
  readonly bundled: string;
  readonly footer: Readonly<Record<string, FooterLink>>;
  readonly states: {
    readonly empty: Message & { readonly action: string };
    readonly emptyUnread: Message;
    readonly error: { readonly message: string; readonly action: string };
  };
};

const firstUse = emptyStates["ES-32"];
const allRead = emptyStates["ES-33"];

export const notificationsPopover = {
  title: "Notifications",
  bellLabel: "Notifications, {n} unread",
  tabs: { all: "All", unread: "Unread" },
  markAllRead: "Mark all as read",
  groups: { today: "Today", earlier: "Earlier" },
  items: notifications,
  bundled: notificationBundles.newSales,
  footer: {
    seeAll: { label: "See all", opens: "ACC-03" },
    settings: { label: "Notification settings", opens: "ACC-07" },
  },
  states: {
    empty: { title: firstUse.title, body: firstUse.body, action: firstUse.actions[0] },
    emptyUnread: { title: allRead.title, body: allRead.body },
    error: { message: "Couldn’t load notifications.", action: "Try again" },
  },
} as const satisfies NotificationsPopoverCopy;
