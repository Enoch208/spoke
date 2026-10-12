"use client";

import type { ClientOutput } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/product/page";
import { useClientQuery, useClientMutation } from "@/lib/query/use-client";

export function PreferenceSettings({ notifications = false }: { notifications?: boolean }) {
  const preferences = useClientQuery("account.preferences", {}, { enabled: !notifications });
  const notificationPreferences = useClientQuery(
    "notifications.preferences",
    {},
    { enabled: notifications },
  );
  const update = useClientMutation("account.updatePreferences", ["account.preferences"]);
  const updateNotifications = useClientMutation("notifications.updatePreferences", [
    "notifications",
  ]);
  if (notifications)
    return (
      <QueryState
        pending={notificationPreferences.isPending}
        error={notificationPreferences.error}
        retry={() => void notificationPreferences.refetch()}
      >
        <Card className="max-w-2xl space-y-4">
          <h2 className="font-display text-h4">Notification preferences</h2>
          {notificationPreferences.data
            ? (
                Object.entries(notificationPreferences.data) as [
                  keyof ClientOutput<"notifications.preferences">,
                  boolean,
                ][]
              ).map(([key, enabled]) => (
                <label className="flex items-center justify-between gap-3" key={key}>
                  <span>{key === "toastsEnabled" ? "Show in-app toasts" : key}</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => {
                      updateNotifications.mutate({ [key]: event.target.checked });
                    }}
                  />
                </label>
              ))
            : null}
          {updateNotifications.error ? (
            <p className="text-pink-ink" role="alert">
              {updateNotifications.error.message}
            </p>
          ) : null}
        </Card>
      </QueryState>
    );
  return (
    <QueryState
      pending={preferences.isPending}
      error={preferences.error}
      retry={() => void preferences.refetch()}
    >
      <Card className="max-w-2xl space-y-4">
        <h2 className="font-display text-h4">Start workspace</h2>
        <p className="text-body text-sm">Choose where you start after signing in.</p>
        {preferences.data ? (
          <div className="flex gap-2">
            {(["buy", "earn", "sell"] as const).map((startWorkspace) => (
              <Button
                key={startWorkspace}
                variant={
                  preferences.data.startWorkspace === startWorkspace ? "primary" : "secondary"
                }
                loading={update.isPending}
                onClick={() => {
                  update.mutate({ startWorkspace });
                }}
              >
                {startWorkspace}
              </Button>
            ))}
          </div>
        ) : null}
        {update.error ? (
          <p className="text-pink-ink" role="alert">
            {update.error.message}
          </p>
        ) : null}
      </Card>
    </QueryState>
  );
}
