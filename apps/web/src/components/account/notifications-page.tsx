"use client";

import Link from "next/link";
import { ProductPage, QueryState } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientQuery, useClientMutation } from "@/lib/query/use-client";

export function NotificationsPage() {
  const notifications = useClientQuery("notifications.list", {}, { refetchInterval: 15_000 });
  const read = useClientMutation("notifications.markRead", ["notifications"]);
  return (
    <ProductPage
      title="Notifications"
      actions={
        <Button
          variant="secondary"
          loading={read.isPending}
          onClick={() => {
            read.mutate({ all: true });
          }}
        >
          Mark all read
        </Button>
      }
    >
      <QueryState
        pending={notifications.isPending}
        error={notifications.error}
        retry={() => void notifications.refetch()}
      >
        <div className="space-y-3">
          {notifications.data?.items.map((notification) => (
            <Link
              key={notification.id}
              href={notification.href}
              onClick={() => {
                read.mutate({ ids: [notification.id] });
              }}
            >
              <Card className={notification.readAt ? "opacity-75" : "bg-lime-soft"}>
                <h2 className="font-medium">{notification.title}</h2>
                <p className="text-body mt-2">{notification.body}</p>
                <p className="text-subtle mt-3 text-xs">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </Card>
            </Link>
          ))}
          {notifications.data?.items.length === 0 ? (
            <Card>
              <p>
                No notifications yet. Confirmed sales, claims and campaign changes will appear here.
              </p>
            </Card>
          ) : null}
        </div>
      </QueryState>
    </ProductPage>
  );
}
