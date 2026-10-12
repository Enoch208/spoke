"use client";

import { Notification01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";

export function NotificationsBell() {
  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="hover:bg-pill flex size-10 items-center justify-center rounded-full"
    >
      <HugeiconsIcon icon={Notification01Icon} size={20} />
    </Link>
  );
}
