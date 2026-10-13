"use client";

import { Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { fill } from "@/lib/copy";
import { formatBps } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref, routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { activeChain } from "@/lib/wagmi";
import { checkoutCopy } from "../copy/checkout";
import { purchaseCopy } from "../copy/purchase";
import { ShareCard } from "../share-card";

type Receipt = ClientOutput<"receipts.get">;
type Campaign = ClientOutput<"campaigns.get">;

const copy = purchaseCopy.detail;

const card = "bg-surface border-hairline flex flex-col gap-3 rounded-2xl border p-4 sm:p-5";

export function FilesCard({
  receipt,
  campaign,
}: {
  receipt: Receipt;
  campaign: Campaign | undefined;
}) {
  const refunded = receipt.state === "REFUNDED";
  return (
    <section className={card}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="bg-pill text-ink flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <HugeiconsIcon icon={Folder01Icon} size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="text-ink font-medium">{copy.filesTitle}</h2>
          <p className="text-subtle text-sm">
            {refunded
              ? copy.accessEnded
              : campaign
                ? fill(copy.filesSummary, {
                    deliverable: checkoutCopy.deliverables[campaign.product.fulfillmentMode],
                    merchant: campaign.merchant.name,
                  })
                : ""}
          </p>
        </div>
      </div>
      {refunded ? null : (
        <Button asChild className="self-start">
          <Link href={routeTo.purchaseAccess(receipt.saleId)}>{copy.openFiles}</Link>
        </Button>
      )}
    </section>
  );
}

export function SharePanel({
  receipt,
  campaign,
}: {
  receipt: Receipt;
  campaign: Campaign | undefined;
}) {
  const links = useClientQuery("links.mine", {});
  if (!campaign || receipt.state === "REFUNDED" || campaign.state !== "FUNDED_ACTIVE") return null;
  const own = links.data?.items.find((link) => link.campaign.campaignId === campaign.campaignId);
  return (
    <ShareCard
      saleId={receipt.saleId}
      campaignId={campaign.campaignId}
      parentNodeId={receipt.nodeId}
      title={purchaseCopy.share.title}
      body={fill(purchaseCopy.share.body, {
        commission: formatBps(campaign.policy.commissionBps),
        max: String(campaign.policy.maxRewardedAncestors),
      })}
      existingNodeId={own?.nodeId ?? null}
    />
  );
}

export function PublicReceiptCard({ receipt }: { receipt: Receipt }) {
  const href = receiptHref(receipt.saleId, activeChain.id);
  const url = typeof window === "undefined" ? href : `${window.location.origin}${href}`;
  return (
    <section className={card}>
      <h2 className="text-ink font-medium">{copy.publicTitle}</h2>
      <p className="text-body text-sm">{copy.publicBody}</p>
      <CopyField value={url} label={copy.copyLink} copiedMessage={copy.linkCopied} mono />
      <Button asChild size="sm" variant="secondary" className="self-start">
        <Link href={href}>{copy.open}</Link>
      </Button>
      <p className="text-subtle text-sm">{copy.publicPrivacy}</p>
    </section>
  );
}

export function HelpCard({ receipt, now }: { receipt: Receipt; now: number }) {
  const refundable =
    receipt.state === "PENDING" && now < Date.parse(receipt.unlockAt) && !receipt.refundRequest;
  return (
    <section className={card}>
      <h2 className="text-ink font-medium">{copy.helpTitle}</h2>
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => {
          if (refundable) useUiStore.getState().open("M-19", { saleId: receipt.saleId });
          else useUiStore.getState().open("M-41", { context: { saleId: receipt.saleId } });
        }}
      >
        {refundable ? copy.askMerchant : copy.report}
      </Button>
    </section>
  );
}
