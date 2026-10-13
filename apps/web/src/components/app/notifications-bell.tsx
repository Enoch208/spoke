"use client";

import { Notification01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Popover } from "@/components/ui/popover";
import { usePhone } from "@/components/ui/use-phone";
import { NotificationsPanel } from "@/components/account/notifications/notifications-panel";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const phone = usePhone();
  const signedIn = useSessionStore((state) => state.status === "signedIn");
  const unread = useClientQuery(
    "notifications.list",
    { unreadOnly: true, limit: 100 },
    { enabled: signedIn, refetchInterval: 30_000 },
  );
  const count = unread.data?.items.length ?? 0;
  const label = count
    ? `Notifications · ${String(count)}${unread.data?.nextCursor ? "+" : ""} unread`
    : "Notifications";
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Notifications"
      width={380}
      trigger={
        <button
          type="button"
          aria-label={label}
          className="hover:bg-pill relative flex size-10 items-center justify-center rounded-full"
        >
          <HugeiconsIcon icon={Notification01Icon} size={20} />
          {count ? (
            <span className="bg-ink text-page absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] tabular-nums">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      }
    >
      <NotificationsPanel
        showHeading={!phone}
        close={() => {
          setOpen(false);
        }}
      />
    </Popover>
  );
}
