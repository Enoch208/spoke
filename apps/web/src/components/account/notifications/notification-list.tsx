"use client";

import { Notification01Icon } from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { cx } from "@/components/ui/cx";
import { formatRelative } from "@/lib/format";
import { useClientMutation } from "@/lib/query/use-client";
import { useNow } from "@/lib/use-now";
import { notificationsCopy as copy } from "../copy/notifications";

export function NotificationList({
  items,
  close,
}: {
  items: ClientOutput<"notifications.list">["items"];
  close?: (() => void) | undefined;
}) {
  const read = useClientMutation("notifications.markRead", ["notifications"]);
  const now = useNow();
  if (!items.length)
    return <EmptyState icon={Notification01Icon} title={copy.empty} body={copy.emptyBody} />;
  return (
    <ul className="divide-hairline divide-y">
      {items.map((notification) => (
        <li key={notification.id}>
          <Link
            href={notification.href}
            onClick={() => {
              if (!notification.readAt) read.mutate({ ids: [notification.id] });
              close?.();
            }}
            className={cx(
              "hover:bg-soft flex items-start gap-3 rounded-xl px-4 py-4",
              !notification.readAt && "bg-lime-soft/40",
            )}
          >
            <span
              className={cx(
                "mt-2 size-2 shrink-0 rounded-full",
                notification.readAt ? "bg-transparent" : "bg-ink",
              )}
              aria-label={notification.readAt ? undefined : copy.markUnread}
            />
            <span className="min-w-0 flex-1">
              <span
                className={cx("text-ink block text-sm", !notification.readAt && "font-semibold")}
              >
                {notification.title}
              </span>
              <span className="text-body mt-1 block text-sm">{notification.body}</span>
              <time dateTime={notification.createdAt} className="text-subtle mt-2 block text-xs">
                {formatRelative(new Date(notification.createdAt), { now: new Date(now) })}
              </time>
            </span>
          </Link>
        </li>
      ))}
      {read.error ? (
        <li role="alert" className="text-pink-ink px-4 py-3 text-sm">
          {read.error.message}
        </li>
      ) : null}
    </ul>
  );
}
