import { accountNotifications } from "./account";
import { businessNotifications } from "./business";
import { peopleNotifications } from "./people";
import type { NotificationCopy } from "./shape";

export { notificationCategories } from "./shape";
export type { NotificationCategory, NotificationCopy } from "./shape";

export const notifications = {
  ...peopleNotifications,
  ...businessNotifications,
  ...accountNotifications,
} as const satisfies Record<`N-${string}`, NotificationCopy>;

export const notificationBundles = {
  newSales: "{count} new sales",
} as const satisfies Record<string, string>;
