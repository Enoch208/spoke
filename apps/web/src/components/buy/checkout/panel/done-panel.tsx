"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";
import { explorerTxUrl } from "@spoke/protocol";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { PanelBackdrop } from "@/components/landing/panel-backdrop";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-field";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { formatAmount, formatDuration, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref, routeTo } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";
import { doneCopy } from "../../copy/done";
import { ShareCard, shareBodyFor } from "../../share-card";
import type { Checkout } from "../use-checkout";

export function DonePanel({ checkout }: { checkout: Checkout }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const campaign = checkout.campaign.data;
  const view = checkout.view;
  const saleId = view.kind === "done" ? view.saleId : null;
  const indexed = view.kind === "done" && view.indexed;
  const receipt = useClientQuery(
    "receipts.get",
    { saleId: saleId ?? "0", chainId: activeChain.id },
    { enabled: saleId !== null, refetchInterval: indexed ? false : 5_000 },
  );
  const links = useClientQuery("links.mine", {}, { enabled: checkout.signedIn });
  if (!campaign) return null;
  const demo = checkout.mode === "demo";
  const price = formatAmount(checkout.price, campaign.token, { testnet: true });
  const unlockAt = receipt.data?.unlockAt;
  const hash = checkout.record?.steps.find((step) => step.kind === "purchase")?.hash ?? null;
  const explorer = hash && !demo ? explorerTxUrl(activeChain.id, hash) : null;
  const syncing = !indexed && !receipt.data;
  const ownLink = links.data?.items.find(
    (link) => link.campaign.campaignId === campaign.campaignId,
  );
  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-2xl">
        <PanelBackdrop tone="lime" />
        <div className="relative flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              ref={heading}
              tabIndex={-1}
              className="font-display text-h4 text-ink scroll-mt-24 font-medium outline-none"
            >
              {doneCopy.heading}
            </h2>
            {syncing ? (
              <StatusChip label={doneCopy.syncingChip} icon={RefreshIcon} tone="sky" />
            ) : null}
          </div>
          <p className="text-ink font-mono text-sm break-words tabular-nums">
            {saleId ? fill(doneCopy.paid, { price, saleId }) : fill(doneCopy.paidNoSale, { price })}
          </p>
          {checkout.resumed || !saleId ? (
            <p className="text-body text-sm">{doneCopy.alreadyWent}</p>
          ) : null}
          <p className="text-body text-sm">{demo ? doneCopy.observedDemo : doneCopy.observed}</p>
          <p className="text-body text-sm">
            {unlockAt
              ? fill(doneCopy.refundUntil, { unlockTime: formatRelative(new Date(unlockAt)) })
              : fill(doneCopy.refundHold, { hold: formatDuration(campaign.policy.holdSeconds) })}
          </p>
          {syncing ? <p className="text-body text-sm">{doneCopy.syncing}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {saleId ? (
              <Button asChild>
                <Link href={routeTo.purchaseAccess(saleId)}>{doneCopy.openFiles}</Link>
              </Button>
            ) : null}
            {saleId ? (
              <Button asChild variant="secondary">
                <Link href={routeTo.purchase(saleId)}>{doneCopy.viewPurchase}</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href="/purchases">{doneCopy.viewPurchase}</Link>
              </Button>
            )}
          </div>
          <div className="text-ink flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {saleId ? (
              <span className="inline-flex items-center gap-1">
                <Link
                  href={receiptHref(saleId, activeChain.id)}
                  className="font-medium underline underline-offset-2"
                >
                  {doneCopy.publicReceipt}
                </Link>
                <CopyButton
                  value={
                    typeof window === "undefined"
                      ? receiptHref(saleId, activeChain.id)
                      : `${window.location.origin}${receiptHref(saleId, activeChain.id)}`
                  }
                  label={doneCopy.copyReceipt}
                  copiedMessage={doneCopy.receiptCopied}
                />
              </span>
            ) : null}
            {explorer ? (
              <a
                href={explorer}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-2"
              >
                {doneCopy.viewTransaction}
              </a>
            ) : null}
          </div>
        </div>
      </section>
      {saleId ? (
        <ShareCard
          saleId={saleId}
          campaignId={campaign.campaignId}
          parentNodeId={checkout.record?.params.nodeId ?? null}
          title={doneCopy.shareTitle}
          body={shareBodyFor(campaign.product.title)}
          existingNodeId={ownLink?.nodeId ?? null}
        />
      ) : null}
    </div>
  );
}
