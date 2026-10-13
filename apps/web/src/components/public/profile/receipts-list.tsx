"use client";

import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  ReceiptDollarIcon,
} from "@hugeicons/core-free-icons";
import type { SaleReceipt } from "@spoke/protocol";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { formatAmount, formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref } from "@/lib/routes";
import { profileCopy } from "../copy/profile";
import type { AnyProfile } from "./types";

const stateChips = {
  FINALIZED: { label: profileCopy.counted, icon: CheckmarkCircle02Icon, tone: "lime" },
  PENDING: { label: profileCopy.pendingState, icon: Clock01Icon, tone: "amber" },
  REFUNDED: { label: profileCopy.refundedState, icon: CancelCircleIcon, tone: "pink" },
} as const;

const shareOf = (receipt: SaleReceipt, profile: AnyProfile) =>
  receipt.allocations.find(
    (allocation) =>
      (profile.handle !== null && allocation.recipient.handle === profile.handle) ||
      (profile.subject !== null &&
        allocation.recipient.address?.toLowerCase() === profile.subject.toLowerCase()),
  ) ?? null;

function ReceiptRow({ receipt, profile }: { receipt: SaleReceipt; profile: AnyProfile }) {
  const campaign = useClientQuery("campaigns.get", { campaignId: receipt.campaignId });
  const share = shareOf(receipt, profile);
  const chip = stateChips[receipt.state];
  return (
    <li>
      <Link
        href={receiptHref(receipt.saleId, receipt.chainId)}
        className="hover:bg-soft ease-spring -mx-3 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-xl px-3 py-3 transition-colors duration-[423ms] sm:grid-cols-[minmax(0,1fr)_11rem_12rem_8rem]"
      >
        <span className="flex min-w-0 flex-col">
          {campaign.data ? (
            <>
              <span className="text-ink truncate font-medium">{campaign.data.product.title}</span>
              <span className="text-subtle truncate text-sm">
                {campaign.data.merchant.name} ·{" "}
                {receipt.source === "native" ? profileCopy.native : profileCopy.attested}
              </span>
            </>
          ) : (
            <Skeleton className="h-9 w-48" />
          )}
        </span>
        <span className="text-ink text-right font-mono tabular-nums sm:order-last">
          {share ? formatAmount(BigInt(share.amount), receipt.token) : "–"}
        </span>
        <span className="text-subtle text-sm sm:text-right">
          {share ? fill(profileCopy.levelValue, { level: String(share.level) }) : ""}
          {" · "}
          {formatDateTime(new Date(receipt.purchasedAt))}
        </span>
        <span className="justify-self-end">
          <StatusChip label={chip.label} icon={chip.icon} tone={chip.tone} />
        </span>
      </Link>
    </li>
  );
}

export function ReceiptsList({ profile, name }: { profile: AnyProfile; name: string }) {
  const items = profile.evidence.items;
  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <h2 id="receipts" className="font-display text-h4 text-ink scroll-mt-24 font-medium">
        {profileCopy.receipts}
      </h2>
      {items.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={ReceiptDollarIcon}
          title={
            profile.visibility === "pseudonymous" && profile.subject === null
              ? profileCopy.pseudonymousReceipts
              : profileCopy.emptyTitle
          }
          body={
            profile.visibility === "pseudonymous" && profile.subject === null
              ? undefined
              : fill(profileCopy.emptyBody, { name })
          }
        />
      ) : (
        <ul aria-label={profileCopy.receiptsCaption} className="flex flex-col">
          {items.map((receipt) => (
            <ReceiptRow key={receipt.saleId} receipt={receipt} profile={profile} />
          ))}
        </ul>
      )}
    </Card>
  );
}
