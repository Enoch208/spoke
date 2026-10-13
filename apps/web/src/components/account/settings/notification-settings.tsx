"use client";

import { QueryState } from "@/components/product/page";
import { Switch } from "@/components/ui/switch";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { SettingsCard } from "./settings-card";

const options = [
  ["sales", "Sales and purchases", "New purchases, refund requests and product access."],
  ["earnings", "Earnings and payouts", "Shares that settle and rewards ready to claim."],
  ["campaigns", "Campaign updates", "Budget alerts, status changes and new terms."],
  ["invitations", "Invitations", "Campaign invitations and responses."],
  [
    "toastsEnabled",
    "In-app messages",
    "Show confirmations and progress messages while using Spoke.",
  ],
] as const;

export function NotificationSettings() {
  const preferences = useClientQuery("notifications.preferences", {});
  const update = useClientMutation("notifications.updatePreferences", ["notifications"]);
  return (
    <QueryState
      pending={preferences.isPending}
      error={preferences.error}
      retry={() => void preferences.refetch()}
    >
      <SettingsCard
        title="Notification preferences"
        description="Choose the updates you receive inside Spoke. Email and push notifications aren't available."
      >
        {preferences.data ? (
          <div className="divide-hairline grid gap-4 divide-y">
            {options.map(([key, label, description]) => (
              <div key={key} className="pt-4 first:pt-0">
                <Switch
                  label={label}
                  description={description}
                  checked={preferences.data[key]}
                  disabled={update.isPending}
                  onCheckedChange={(value) => {
                    update.mutate({ [key]: value });
                  }}
                />
              </div>
            ))}
            <div className="pt-4">
              <Switch
                label="Security and account"
                description="Sign-ins, recovery and security changes always appear. These can't be turned off."
                checked
                disabled
                onCheckedChange={() => undefined}
              />
            </div>
          </div>
        ) : null}
        {update.error ? (
          <p className="text-pink-ink text-sm" role="alert">
            {update.error.message}
          </p>
        ) : null}
      </SettingsCard>
    </QueryState>
  );
}
