"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useSpokeClient } from "@/lib/client/provider";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { launchedCopy } from "./copy-launch";
import type { LaunchState } from "./launch-state";
import type { ComposerModel, ComposerSetup } from "./use-composer";

const carried = ["product", "template", "version", "from"] as const;

export const launchedUrl = (campaignId: string) =>
  `${routes.sell.newCampaign}?step=launched&campaign=${encodeURIComponent(campaignId)}`;

export function useComposerUrl(model: ComposerModel, enabled: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { setup, step, persisted } = model;
  const campaignId = setup.target?.campaignId ?? null;
  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams();
    if (setup.mode === "newVersion" && campaignId) {
      params.set("mode", "newVersion");
      params.set("campaign", campaignId);
    }
    if (persisted) params.set("draft", setup.draftId);
    else
      for (const key of carried) {
        const value = search.get(key);
        if (value) params.set(key, value);
      }
    params.set("step", step);
    const next = `${pathname}?${params.toString()}`;
    if (`${window.location.pathname}${window.location.search}` !== next)
      router.replace(next, { scroll: false });
  }, [enabled, router, pathname, search, setup.mode, setup.draftId, campaignId, persisted, step]);
}

export function useLaunchedRedirect(setup: ComposerSetup, alertSales: string, state: LaunchState) {
  const router = useRouter();
  const client = useSpokeClient();
  const pushToast = useUiStore((store) => store.pushToast);
  const handled = useRef(false);
  const campaignId = state.kind === "done" ? state.campaignId : null;
  useEffect(() => {
    if (campaignId === null || handled.current) return;
    handled.current = true;
    if (!campaignId) {
      router.replace(routes.sell.campaigns);
      return;
    }
    const alert = Number(alertSales);
    if (
      client &&
      Number.isInteger(alert) &&
      alert >= 1 &&
      alert <= 50 &&
      alert !== setup.alertDefault
    )
      void client
        .call("campaigns.updateSettings", { campaignId, budgetAlertSales: alert })
        .catch(() => {
          pushToast({
            id: "T-25",
            tone: "error",
            message: launchedCopy.alertFailed,
            durationMs: 8000,
          });
        });
    router.replace(launchedUrl(campaignId));
  }, [campaignId, alertSales, client, pushToast, router, setup.alertDefault]);
}
