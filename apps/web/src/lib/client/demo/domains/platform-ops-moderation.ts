import { iso } from "../../../../demo/world/ids";
import {
  detailOf,
  freezeEndsAt,
  moderationCategory,
  tabOf,
  type ModerationTab,
} from "../../../../demo/world/seed-platform-moderation";
import type { DemoOpsCase, DemoWorld, SupportItem } from "../../../../demo/world/world";
import { fail } from "../handler";

export const linkedCase = (world: DemoWorld, item: SupportItem) =>
  world.opsCases.find((candidate) => {
    const id = candidate.detail.id;
    return item.id.startsWith(`${id}-`) || id === `${item.id}-case`;
  });

export const isActive = (item: SupportItem, now: number) =>
  item.status === "open" && (tabOf(item) !== "Frozen" || freezeEndsAt(item) > now);

const scoped = (
  world: DemoWorld,
  opsCase: DemoOpsCase,
  item: SupportItem | undefined,
  tabs: readonly ModerationTab[],
) => {
  const tab = item ? tabOf(item) : null;
  if (item && tab !== null && tabs.includes(tab)) return [item];
  return world.moderation.filter((candidate) => {
    const candidateTab = tabOf(candidate);
    return (
      candidate.id.startsWith(`${opsCase.detail.id}-`) &&
      candidateTab !== null &&
      tabs.includes(candidateTab)
    );
  });
};

export const settle = (item: SupportItem, status: SupportItem["status"], now: number) => {
  item.status = status;
  item.updatedAt = iso(now);
};

export const upsert = (
  world: DemoWorld,
  opsCase: DemoOpsCase,
  tab: ModerationTab,
  subject: string,
  now: number,
) => {
  const id = `${opsCase.detail.id}-${tab.toLowerCase()}`;
  const existing = world.moderation.find((item) => item.id === id);
  if (existing) {
    existing.subject = subject;
    settle(existing, "open", now);
    return;
  }
  const at = iso(now);
  const category = moderationCategory(tab, detailOf(opsCase.subject));
  world.moderation.push({ id, subject, category, status: "open", createdAt: at, updatedAt: at });
};

export const restoreItems = (
  world: DemoWorld,
  opsCase: DemoOpsCase,
  item: SupportItem | undefined,
  tabs: readonly ModerationTab[],
  now: number,
) => {
  const targets = scoped(world, opsCase, item, tabs).filter((candidate) =>
    isActive(candidate, now),
  );
  if (!targets.length)
    return fail("VALIDATION_FAILED", "There is nothing active to restore for this subject.");
  for (const target of targets) settle(target, "resolved", now);
};

export const dismissReport = (
  world: DemoWorld,
  opsCase: DemoOpsCase,
  item: SupportItem | undefined,
  now: number,
) => {
  const report = scoped(world, opsCase, item, ["Report"]).find(
    (candidate) => candidate.status !== "declined",
  );
  if (!report) return fail("VALIDATION_FAILED", "There is no open report to dismiss.");
  settle(report, "declined", now);
};

export const resolveAppeals = (world: DemoWorld, opsCase: DemoOpsCase, now: number) => {
  for (const appeal of scoped(world, opsCase, undefined, ["Appeal"]))
    if (appeal.status === "open") settle(appeal, "resolved", now);
};
