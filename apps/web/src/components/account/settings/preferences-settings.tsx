"use client";

import Link from "next/link";
import { QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { useDemoMode } from "@/lib/demo/use-demo-mode";
import { useModeStore } from "@/lib/stores/mode";
import { useUiStore } from "@/lib/stores/ui";
import { SettingsCard } from "./settings-card";

export function PreferencesSettings() {
  const preferences = useClientQuery("account.preferences", {});
  const me = useClientQuery("account.me", {});
  const update = useClientMutation("account.updatePreferences", ["account.preferences"]);
  const mode = useModeStore((state) => state.mode);
  const persona = useModeStore((state) => state.persona);
  const { exitDemo } = useDemoMode();
  return (
    <QueryState
      pending={preferences.isPending}
      error={preferences.error}
      retry={() => void preferences.refetch()}
    >
      <div className="grid gap-5">
        <SettingsCard
          title="Display"
          description="Token amounts are shown in their original currency. SDUSD is a testnet demonstration token with no cash value."
        >
          <RadioGroup
            label="Theme"
            value="light"
            onValueChange={() => undefined}
            options={[
              {
                value: "light",
                label: "Light",
                description:
                  "Spoke has a light theme only. Your device's dark mode setting doesn't change Spoke.",
              },
            ]}
          />
          <div>
            <p className="text-ink text-sm font-medium">English</p>
            <p className="text-subtle text-sm">Spoke is available in English only.</p>
          </div>
        </SettingsCard>
        <SettingsCard title="Start-up" description="Choose where Spoke opens after you sign in.">
          {preferences.data ? (
            <RadioGroup
              label="Open Spoke in"
              value={preferences.data.startWorkspace}
              onValueChange={(startWorkspace) => {
                update.mutate({ startWorkspace });
              }}
              options={[
                { value: "earn", label: "Earn" },
                { value: "buy", label: "Explore campaigns" },
                ...(me.data?.isMerchant ? [{ value: "sell" as const, label: "Sell" }] : []),
              ]}
            />
          ) : null}
          {update.error ? (
            <p role="alert" className="text-pink-ink text-sm">
              {update.error.message}
            </p>
          ) : null}
        </SettingsCard>
        <SettingsCard
          title="Demo on this browser"
          description={
            mode === "demo"
              ? `You're exploring the demo as the ${persona}.`
              : "You're in Live mode."
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/demo">{mode === "demo" ? "Switch persona" : "Explore the demo"}</Link>
            </Button>
            {mode === "demo" ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    exitDemo();
                  }}
                >
                  Exit demo
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    useUiStore.getState().open("M-42", { intent: "reset" });
                  }}
                >
                  Reset demo data
                </Button>
              </>
            ) : null}
          </div>
        </SettingsCard>
      </div>
    </QueryState>
  );
}
