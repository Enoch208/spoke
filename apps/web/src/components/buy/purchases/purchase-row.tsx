"use client";

import { Message01Icon } from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignArt } from "@/components/product/campaign-art";
import { SaleStateChip } from "@/components/product/state-chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonAmount } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { Td, Tr } from "@/components/ui/table";
import { globalStates } from "@/lib/copy";
import { formatAmount, formatHandle, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { purchaseCopy } from "../copy/purchase";
import { buyerLine } from "./lines";

export type PurchaseRow = ClientOutput<"receipts.forBuyer">["items"][number];

const copy = purchaseCopy.list;

function usePrices(row: PurchaseRow, testnet: boolean) {
  const campaign = useClientQuery("campaigns.get", { campaignId: row.campaignId });
  const token = campaign.data?.token;
  if (!token) return { shown: null, plain: null };
  return {
    shown: formatAmount(BigInt(row.amountPaid), token, { testnet }),
    plain: formatAmount(BigInt(row.amountPaid), token),
  };
}

function Status({ row, now, price }: { row: PurchaseRow; now: number; price: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <SaleStateChip status={row.state} unlockAt={row.unlockAt} />
        {row.refundRequestStatus === "open" ? (
          <StatusChip label={copy.refundRequested} icon={Message01Icon} tone="amber" />
        ) : null}
      </div>
      <p className="text-subtle text-sm">
        {buyerLine({
          status: row.state,
          unlockAt: row.unlockAt,
          refundedAt: row.refundedAt,
          price: price ?? "",
          now,
        })}
      </p>
    </div>
  );
}

function Product({ row, demo }: { row: PurchaseRow; demo: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CampaignArt
        seed={row.campaignId}
        imageUrl={row.image ?? undefined}
        title={row.productTitle}
        className="size-12 shrink-0 rounded-xl"
      />
      <div className="min-w-0">
        <p className="text-ink line-clamp-2 font-medium">{row.productTitle}</p>
        <p className="text-subtle flex flex-wrap items-center gap-1.5 text-sm">
          <span className="truncate">{row.merchantName}</span>
          {demo ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
        </p>
      </div>
    </div>
  );
}

function OpenFiles({ row, block }: { row: PurchaseRow; block: boolean }) {
  if (row.state === "REFUNDED") return null;
  return (
    <Button asChild size={block ? "md" : "sm"} variant="secondary" block={block}>
      <Link
        href={routeTo.purchaseAccess(row.saleId)}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {copy.openFiles}
      </Link>
    </Button>
  );
}

export function PurchaseTableRow({
  row,
  now,
  first,
  demo,
}: {
  row: PurchaseRow;
  now: number;
  first: boolean;
  demo: boolean;
}) {
  const router = useRouter();
  const price = usePrices(row, first);
  return (
    <Tr
      interactive
      onClick={() => {
        router.push(routeTo.purchase(row.saleId));
      }}
    >
      <Td className="max-w-[280px] py-3">
        <Link href={routeTo.purchase(row.saleId)} className="block">
          <Product row={row} demo={demo} />
        </Link>
      </Td>
      <Td numeric className="whitespace-nowrap">
        {price.shown ?? <SkeletonAmount />}
      </Td>
      <Td className="max-w-[300px] py-3">
        <Status row={row} now={now} price={price.plain} />
      </Td>
      <Td className="text-body whitespace-nowrap">
        {row.referrerHandle ? formatHandle(row.referrerHandle) : copy.direct}
      </Td>
      <Td className="text-body whitespace-nowrap">
        {formatRelative(new Date(row.purchasedAt), { now: new Date(now) })}
      </Td>
      <Td className="text-right">
        <OpenFiles row={row} block={false} />
      </Td>
    </Tr>
  );
}

export function PurchaseCard({ row, now, demo }: { row: PurchaseRow; now: number; demo: boolean }) {
  const price = usePrices(row, true);
  return (
    <li className="bg-surface border-hairline flex flex-col gap-3 rounded-2xl border p-4">
      <Link href={routeTo.purchase(row.saleId)} className="flex flex-col gap-3">
        <Product row={row} demo={demo} />
        <p className="text-ink font-mono text-sm break-words tabular-nums">
          {price.shown ?? <SkeletonAmount length="short" />}
        </p>
        <Status row={row} now={now} price={price.plain} />
      </Link>
      <OpenFiles row={row} block />
    </li>
  );
}
