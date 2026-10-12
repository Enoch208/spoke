import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { demoId } from "../../../../demo/world/ids";
import {
  toNotification,
  type NoticeBody,
  type NoticeCategory,
} from "../../../../demo/world/seed-accounts-copy";
import type { DemoId } from "../../../../demo/world/types";
import type { NotificationPreferences } from "../../../../demo/world/world";

type CategorySwitch = Exclude<keyof NotificationPreferences, "toastsEnabled">;

export const preferenceOf: Record<NoticeCategory, CategorySwitch> = {
  earnings: "earnings",
  network: "earnings",
  invitations: "invitations",
  purchases: "sales",
  campaigns: "campaigns",
  business: "campaigns",
  account: "account",
};

export const notify = (runtime: DemoRuntime, personId: DemoId, body: NoticeBody): void => {
  const account = runtime.world.accounts[personId];
  if (!account) return;
  const switchedOn =
    body.category === "account" || account.notificationPreferences[preferenceOf[body.category]];
  if (!switchedOn) return;
  const id = demoId("ntf", runtime.nextId("ntf"));
  account.notifications.push(toNotification(id, { ...body, at: runtime.now() }, null));
};
