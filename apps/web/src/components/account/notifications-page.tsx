"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { notificationsCopy as copy } from "./copy/notifications";
import { NotificationList } from "./notifications/notification-list";

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [category, setCategory] = useState("all");
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const cursor = cursors[page];
  const list = useClientQuery(
    "notifications.list",
    {
      limit: 25,
      unreadOnly,
      ...(category !== "all" ? { category } : {}),
      ...(cursor ? { cursor } : {}),
    },
    { refetchInterval: 30_000 },
  );
  const read = useClientMutation("notifications.markRead", ["notifications"]);
  const resetPage = () => {
    setCursors([undefined]);
    setPage(0);
  };
  return (
    <ProductPage
      title={copy.title}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={read.isPending}
            onClick={() => {
              read.mutate({ all: true });
            }}
          >
            {copy.markAll}
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/settings/notifications">{copy.settings}</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <Field label="Show">
          <Select
            value={unreadOnly ? "unread" : "all"}
            onValueChange={(value) => {
              setUnreadOnly(value === "unread");
              resetPage();
            }}
            options={[
              { value: "all", label: copy.all },
              { value: "unread", label: copy.unread },
            ]}
          />
        </Field>
        <Field label="Category">
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value);
              resetPage();
            }}
            options={[
              { value: "all", label: "All categories" },
              ...copy.categories.map((value) => ({
                value,
                label: value.charAt(0).toUpperCase() + value.slice(1),
              })),
            ]}
          />
        </Field>
      </div>
      {read.error ? (
        <p role="alert" className="text-pink-ink text-sm">
          {read.error.message}
        </p>
      ) : null}
      <QueryState pending={list.isPending} error={list.error} retry={() => void list.refetch()}>
        {list.data ? (
          <Card className="p-1 sm:p-2">
            <NotificationList items={list.data.items} />
          </Card>
        ) : null}
      </QueryState>
      <Pagination
        label="Notifications pages"
        page={page + 1}
        hasPrevious={page > 0}
        hasNext={Boolean(list.data?.nextCursor)}
        onPrevious={() => {
          setPage(Math.max(0, page - 1));
        }}
        onNext={() => {
          const next = list.data?.nextCursor;
          if (next) {
            setCursors([...cursors.slice(0, page + 1), next]);
            setPage(page + 1);
          }
        }}
      />
    </ProductPage>
  );
}
