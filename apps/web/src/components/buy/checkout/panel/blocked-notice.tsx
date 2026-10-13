"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { blockedActionLabels, blockedCopy, type BlockedKey } from "../../copy/blocked";
import type { Checkout } from "../use-checkout";

const directLabel = (key: BlockedKey) =>
  key === "exhausted" || key === "zeroReward"
    ? blockedActionLabels.direct.exhausted
    : key === "selfReferral"
      ? blockedActionLabels.direct.selfReferral
      : key === "otherCampaign"
        ? blockedActionLabels.direct.otherCampaign
        : blockedActionLabels.direct.fallback;

export function BlockedNotice({
  checkout,
  blocked,
  onDirect,
}: {
  checkout: Checkout;
  blocked: BlockedKey;
  onDirect: () => void;
}) {
  const campaign = checkout.campaign.data;
  const copy = blockedCopy[blocked];
  const otherCampaign = checkout.referral.otherCampaignId;
  const other = useClientQuery(
    "campaigns.get",
    { campaignId: otherCampaign ?? "0" },
    { enabled: otherCampaign !== null },
  );
  const sale = checkout.preview.data?.buyer?.alreadyPurchasedSaleId ?? null;
  const body = fill(copy.body, {
    endsAt: campaign ? formatDateTime(new Date(campaign.endsAt)) : "",
    product: other.data?.product.title ?? "",
  });
  return (
    <div role="alert" className="bg-amber-soft flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <HugeiconsIcon
          icon={Alert02Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-amber-ink mt-0.5 shrink-0"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-ink font-medium">{copy.title}</p>
          <p className="text-body text-sm">{body}</p>
          {"second" in copy ? <p className="text-body text-sm">{copy.second}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {copy.actions.map((action) => {
          if (action === "direct")
            return checkout.preview.data?.directPurchaseAvailable !== false ? (
              <Button key={action} variant="secondary" onClick={onDirect}>
                {directLabel(blocked)}
              </Button>
            ) : null;
          if (action === "purchase" && sale)
            return [
              <Button key="files" asChild>
                <Link href={routeTo.purchaseAccess(sale)}>{blockedActionLabels.openFiles}</Link>
              </Button>,
              <Button key="view" asChild variant="secondary">
                <Link href={routeTo.purchase(sale)}>{blockedActionLabels.viewPurchase}</Link>
              </Button>,
            ];
          if (action === "otherCampaign" && otherCampaign)
            return (
              <Button key={action} asChild variant="secondary">
                <Link href={routeTo.campaign(otherCampaign)}>
                  {blockedActionLabels.otherCampaign}
                </Link>
              </Button>
            );
          if (action === "explore")
            return (
              <Button key={action} asChild variant="secondary">
                <Link href={routes.explore}>{blockedActionLabels.explore}</Link>
              </Button>
            );
          if (action === "backToCampaign" && campaign)
            return (
              <Button key={action} asChild variant="secondary">
                <Link href={routeTo.campaign(campaign.campaignId)}>
                  {blockedActionLabels.backToCampaign}
                </Link>
              </Button>
            );
          if (action === "demo")
            return (
              <Button
                key={action}
                variant="secondary"
                onClick={() => {
                  useUiStore.getState().open("M-42", { intent: "enter", persona: "buyer" });
                }}
              >
                {blockedActionLabels.demo}
              </Button>
            );
          if (action === "retry")
            return (
              <Button
                key={action}
                variant="secondary"
                onClick={() => void checkout.preview.refetch()}
              >
                {blockedActionLabels.retry}
              </Button>
            );
          return null;
        })}
      </div>
    </div>
  );
}
