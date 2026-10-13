"use client";

import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/spinner";
import { fill } from "@/lib/copy";
import { formatRelative } from "@/lib/format";
import type { Overall } from "./overall";
import { statusCopy } from "./status-copy";

const looks: Record<Overall, { box: string; text: string; icon: IconSvgElement | null }> = {
  working: { box: "bg-lime-soft", text: "text-olive", icon: CheckmarkCircle02Icon },
  degraded: { box: "bg-amber-soft", text: "text-amber-ink", icon: Alert02Icon },
  outage: { box: "bg-pink-soft", text: "text-pink-ink", icon: CancelCircleIcon },
  apiDown: { box: "bg-pink-soft", text: "text-pink-ink", icon: CancelCircleIcon },
  notDeployed: { box: "bg-soft", text: "text-muted", icon: HelpCircleIcon },
  checking: { box: "bg-soft", text: "text-muted", icon: null },
};

export function OverallBanner({
  state,
  checkedAt,
  refreshing,
  onRefresh,
}: {
  state: Overall;
  checkedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const look = looks[state];
  return (
    <section
      aria-live="polite"
      className={cx(
        "flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center lg:p-8",
        look.box,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className={cx("mt-1 shrink-0", look.text)}>
          {look.icon ? (
            <HugeiconsIcon icon={look.icon} size={28} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Spinner size={28} />
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            className={cx(
              "font-display font-medium",
              state === "apiDown" ? "text-lead" : "text-h4 sm:text-title",
              look.text,
            )}
          >
            {statusCopy.overall[state]}
          </h2>
          {checkedAt !== null ? (
            <p className="text-body text-sm">
              {fill(statusCopy.checked, { relative: formatRelative(new Date(checkedAt)) })}
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="secondary" icon={RefreshIcon} loading={refreshing} onClick={onRefresh}>
        {statusCopy.refresh}
      </Button>
    </section>
  );
}
