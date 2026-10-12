import { mutationHook, queryHook } from "../use-client";

export const useNotificationsList = queryHook("notifications.list");
export const useNotificationsMarkReadMutation = mutationHook("notifications.markRead", [
  "notifications",
]);
export const useNotificationsPreferences = queryHook("notifications.preferences");
export const useNotificationsUpdatePreferencesMutation = mutationHook(
  "notifications.updatePreferences",
  ["notifications"],
);
