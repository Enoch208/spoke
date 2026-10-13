"use client";

import Link from "next/link";
import { useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { notificationsCopy as copy } from "../copy/notifications";
import { NotificationList } from "./notification-list";

export function NotificationsPanel({
  close,
  showHeading = true,
}: {
  close: () => void;
  showHeading?: boolean;
}) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useClientQuery(
    "notifications.list",
    { limit: 10, unreadOnly },
    { refetchInterval: 30_000 },
  );
  const read = useClientMutation("notifications.markRead", ["notifications"]);
  return (
    <div className="grid gap-2">
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        {showHeading ? <h2 className="text-ink font-medium">{copy.title}</h2> : null}
        <Button
          size="sm"
          variant="ghost"
          loading={read.isPending}
          disabled={!list.data?.items.some((item) => !item.readAt)}
          onClick={() => {
            read.mutate({ all: true });
          }}
        >
          {copy.markAll}
        </Button>
      </header>
      <Field label="Show notifications" className="px-4">
        <Select
          value={unreadOnly ? "unread" : "all"}
          onValueChange={(value) => {
            setUnreadOnly(value === "unread");
          }}
          options={[
            { value: "all", label: copy.all },
            { value: "unread", label: copy.unread },
          ]}
        />
      </Field>
      <QueryState pending={list.isPending} error={list.error} retry={() => void list.refetch()}>
        {list.data ? <NotificationList items={list.data.items} close={close} /> : null}
      </QueryState>
      {read.error ? (
        <p role="alert" className="text-pink-ink px-4 text-sm">
          {read.error.message}
        </p>
      ) : null}
      <footer className="border-hairline flex justify-between gap-3 border-t px-4 py-3 text-sm">
        <Link href="/notifications" onClick={close} className="text-ink underline">
          {copy.viewAll}
        </Link>
        <Link href="/settings/notifications" onClick={close} className="text-subtle underline">
          Settings
        </Link>
      </footer>
    </div>
  );
}

export default function NotificationsModal({ close, isTop }: ModalComponentProps<"M-40">) {
  return (
    <Dialog
      open
      inert={!isTop}
      title={copy.title}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      size="md"
    >
      <NotificationsPanel close={close} showHeading={false} />
    </Dialog>
  );
}
