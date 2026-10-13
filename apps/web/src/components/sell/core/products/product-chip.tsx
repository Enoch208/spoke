"use client";

import { CheckmarkBadge01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip } from "@/components/ui/tooltip";
import { useClientQuery } from "@/lib/query/use-client";
import { productsCopy as copy } from "../copy/products";
import { missingFor, missingLabel, type Product } from "./product-status";

export function ProductStatusChip({
  product,
  size = "sm",
}: {
  product: Product;
  size?: "sm" | "md";
}) {
  const missing = missingFor(product);
  if (missing.length === 0)
    return <StatusChip label={copy.ready} icon={CheckmarkBadge01Icon} tone="lime" size={size} />;
  return (
    <Tooltip
      content={
        <ul className="list-disc space-y-0.5 pl-4">
          {missing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      }
    >
      <span tabIndex={0} className="inline-flex flex-wrap items-center gap-2">
        <StatusChip label={copy.draft} icon={PencilEdit02Icon} tone="faint" size={size} />
        <span className="text-subtle text-xs">{missingLabel(missing.length)}</span>
      </span>
    </Tooltip>
  );
}

export type ProductUsage = { live: number; paused: number; liveCampaignId: string | null };

export function useProductUsage(slug: string | undefined) {
  const active = useClientQuery(
    "campaigns.list",
    { merchant: slug ?? "", status: "active", limit: 100 },
    { enabled: Boolean(slug) },
  );
  const paused = useClientQuery(
    "campaigns.list",
    { merchant: slug ?? "", status: "paused", limit: 100 },
    { enabled: Boolean(slug) },
  );
  const usage = new Map<string, ProductUsage>();
  const bump = (productId: string, key: "live" | "paused", campaignId: string) => {
    const current = usage.get(productId) ?? { live: 0, paused: 0, liveCampaignId: null };
    usage.set(productId, {
      ...current,
      [key]: current[key] + 1,
      liveCampaignId:
        key === "live" ? (current.liveCampaignId ?? campaignId) : current.liveCampaignId,
    });
  };
  for (const card of active.data?.items ?? []) bump(card.product.id, "live", card.campaignId);
  for (const card of paused.data?.items ?? []) bump(card.product.id, "paused", card.campaignId);
  return usage;
}
