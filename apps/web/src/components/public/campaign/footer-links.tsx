"use client";

import { CodeIcon, Copy01Icon, QrCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/ui/use-copy";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { routes, routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { campaignCopy } from "../copy/campaign";
import { reportCopy } from "../copy/report";
import { hasModal } from "../shared/modals-ready";
import { ReportButton } from "../shared/report-button";

const embedLabel = campaignCopy.footer.embed;

export function CampaignFooterLinks({
  campaignId,
  title,
  linkNodeId,
}: {
  campaignId: string;
  title: string;
  linkNodeId: string | null;
}) {
  const { mode } = useClientContext();
  const copy = useCopy();
  const open = useUiStore((state) => state.open);
  const link = useClientQuery(
    "links.get",
    { nodeId: linkNodeId ?? "0" },
    { enabled: linkNodeId !== null },
  );
  const ownUrl = linkNodeId ? (link.data?.url ?? null) : null;
  const shareUrl = () => ownUrl ?? `${window.location.origin}${routeTo.campaign(campaignId)}`;
  return (
    <div className="border-hairline flex flex-wrap items-center gap-1 border-t pt-4">
      <ReportButton
        label={reportCopy.campaign}
        target={{ kind: "campaign", id: campaignId, name: title }}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={Copy01Icon}
        onClick={() => {
          void copy(
            shareUrl(),
            ownUrl ? campaignCopy.footer.ownCopied : campaignCopy.footer.plainCopied,
          );
        }}
      >
        {campaignCopy.footer.copyLink}
      </Button>
      {hasModal("M-14") ? (
        <Button
          variant="ghost"
          size="sm"
          icon={QrCodeIcon}
          onClick={() => {
            open("M-14", { url: shareUrl(), title });
          }}
        >
          {campaignCopy.footer.qr}
        </Button>
      ) : null}
      {mode === "demo" ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={routes.developers.widgets}>
            <HugeiconsIcon icon={CodeIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
            {embedLabel}
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          icon={CodeIcon}
          onClick={() => {
            open("M-44", { featureKey: "widgets", returnTo: routeTo.campaign(campaignId) });
          }}
        >
          {embedLabel}
        </Button>
      )}
    </div>
  );
}
