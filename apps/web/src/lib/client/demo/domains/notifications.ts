import { DAY, iso } from "../../../../demo/world/ids";
import type { PartialHandlers } from "../handler";
import { page } from "../views/basics";
import { accountOf } from "./account-store";

export const NOTIFICATION_RETENTION_MS = 90 * DAY;

export const notificationsReads = {
  "notifications.list": (input, runtime) => {
    const now = runtime.now();
    const items = accountOf(runtime)
      .notifications.filter((item) => {
        const at = Date.parse(item.createdAt);
        return at <= now && at > now - NOTIFICATION_RETENTION_MS;
      })
      .filter(
        (item) =>
          input.category === undefined ||
          input.category === "all" ||
          item.category === input.category,
      )
      .filter((item) => input.unreadOnly !== true || item.readAt === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .map((item) => ({ ...item }));
    return page(items, input);
  },
  "notifications.preferences": (_input, runtime) => ({
    ...accountOf(runtime).notificationPreferences,
  }),
} satisfies PartialHandlers<"notifications">;

export const notificationsWrites = {
  "notifications.markRead": (input, runtime) => {
    const now = runtime.now();
    const ids = "ids" in input ? new Set(input.ids) : null;
    for (const item of accountOf(runtime).notifications)
      if (
        item.readAt === null &&
        Date.parse(item.createdAt) <= now &&
        (ids === null || ids.has(item.id))
      )
        item.readAt = iso(now);
    return { ok: true };
  },
  "notifications.updatePreferences": (input, runtime) => {
    const account = accountOf(runtime);
    const current = account.notificationPreferences;
    account.notificationPreferences = {
      sales: input.sales ?? current.sales,
      earnings: input.earnings ?? current.earnings,
      campaigns: input.campaigns ?? current.campaigns,
      invitations: input.invitations ?? current.invitations,
      account: true,
      toastsEnabled: input.toastsEnabled ?? current.toastsEnabled,
    };
    return { ...account.notificationPreferences };
  },
} satisfies PartialHandlers<"notifications">;
