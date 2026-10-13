"use client";

import {
  Alert01Icon,
  CloudSavingDone01Icon,
  Loading03Icon,
  WifiDisconnected01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { formatRelative } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { composerCopy } from "./copy";
import type { SaveStatus } from "./use-draft-save";

const copy = composerCopy.save;

export type SaveBlock = "needsProduct" | "needsFix" | null;

export function SaveIndicator({
  status,
  savedAt,
  blocked,
}: {
  status: SaveStatus;
  savedAt: string | null;
  blocked: SaveBlock;
}) {
  const now = useNow();
  const view: { icon: IconSvgElement; text: string; tone: string } | null =
    status === "saving"
      ? { icon: Loading03Icon, text: copy.saving, tone: "text-subtle" }
      : status === "failed"
        ? { icon: Alert01Icon, text: copy.failed, tone: "text-amber-ink" }
        : status === "offline"
          ? { icon: WifiDisconnected01Icon, text: copy.offline, tone: "text-amber-ink" }
          : blocked
            ? { icon: Alert01Icon, text: copy[blocked], tone: "text-subtle" }
            : savedAt
              ? {
                  icon: CloudSavingDone01Icon,
                  text: fill(copy.saved, {
                    relative: formatRelative(new Date(savedAt), { now: new Date(now) }),
                  }),
                  tone: "text-subtle",
                }
              : null;
  if (!view) return null;
  return (
    <p role="status" className={cx("flex items-center gap-1.5 text-sm", view.tone)}>
      <HugeiconsIcon
        icon={view.icon}
        size={16}
        strokeWidth={1.8}
        aria-hidden="true"
        className={status === "saving" ? "animate-spin" : undefined}
      />
      {view.text}
    </p>
  );
}
