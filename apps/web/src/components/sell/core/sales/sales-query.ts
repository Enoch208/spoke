"use client";

import type { ClientInput, ClientOutput } from "@spoke/protocol";
import { useState } from "react";
import { useClientQuery } from "@/lib/query/use-client";
import { pick, useQueryParams } from "../shared/use-query-params";
import { useCursorPages } from "../shared/use-cursor-pages";

export type SaleListRow = ClientOutput<"receipts.forMerchant">["items"][number];

export const saleTabs = ["all", "pending", "refunded", "finalized", "claimed"] as const;
export type SaleTab = (typeof saleTabs)[number];

export const periods = ["all", "7d", "30d", "90d"] as const;
export type Period = (typeof periods)[number];

const days = { "7d": 7, "30d": 30, "90d": 90 } as const;
const dayMs = 86_400_000;

const stateFor = {
  pending: "PENDING",
  refunded: "REFUNDED",
  finalized: "FINALIZED",
  claimed: "FINALIZED",
} as const;

export function useSalesQuery(fixedCampaignId: string | undefined, now: number) {
  const params = useQueryParams();
  const pages = useCursorPages();
  const [anchor] = useState(() => Date.now());
  const tab = pick(params.get("state"), saleTabs, "all");
  const period = pick(params.get("period"), periods, "all");
  const campaign = fixedCampaignId ?? params.get("campaign") ?? undefined;
  const q = params.get("q") ?? "";
  const maturing = params.get("maturing") === "24h";
  const matured = params.get("matured") === "1";
  const input: ClientInput<"receipts.forMerchant"> = {
    limit: 25,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
    ...(tab === "all" ? {} : { state: stateFor[tab] }),
    ...(campaign ? { campaignId: campaign } : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(period === "all"
      ? {}
      : {
          range: {
            from: new Date(anchor - days[period] * dayMs).toISOString(),
            to: new Date(anchor + dayMs).toISOString(),
          },
        }),
  };
  const sales = useClientQuery("receipts.forMerchant", input, { refetchInterval: 15_000 });
  const rows = (sales.data?.items ?? []).filter((row) => {
    if (tab === "finalized" && row.proceedsState === "claimed") return false;
    if (tab === "claimed" && row.proceedsState !== "claimed") return false;
    const unlock = Date.parse(row.unlockAt);
    if (matured && !(row.state === "PENDING" && unlock <= now)) return false;
    if (maturing && !(row.state === "PENDING" && unlock <= now + dayMs)) return false;
    return true;
  });
  const update = (changes: Readonly<Record<string, string | null>>) => {
    pages.reset();
    params.set(changes);
  };
  const filtered =
    tab !== "all" ||
    period !== "all" ||
    Boolean(q) ||
    maturing ||
    matured ||
    (!fixedCampaignId && Boolean(campaign));
  return { sales, rows, tab, period, campaign, q, maturing, matured, pages, update, filtered };
}
