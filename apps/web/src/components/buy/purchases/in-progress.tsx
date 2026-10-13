"use client";

import { Clock01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { txOverallStatus } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import type { Mode } from "@/lib/stores/mode";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus } from "@/lib/tx/records";
import type { AnyTxRecord, TxRecord } from "@/lib/tx/types";
import { purchaseCopy } from "../copy/purchase";
import { viewRecord } from "../checkout/model";

type PurchaseRecord = TxRecord<"purchase">;

const isOpenPurchase = (record: AnyTxRecord): record is PurchaseRecord =>
  record.kind === "purchase" && viewRecord(record).kind !== "done" && !record.expired;

function Row({ record }: { record: PurchaseRecord }) {
  const campaign = useClientQuery("campaigns.get", { campaignId: record.params.campaignId });
  const token = campaign.data?.token;
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate font-medium">{record.params.productTitle}</p>
        <p className="text-subtle text-sm">
          {record.params.merchantName}
          {token ? (
            <span className="font-mono tabular-nums">
              {" · "}
              {formatAmount(BigInt(record.params.price), token)}
            </span>
          ) : null}
        </p>
      </div>
      <StatusChip label={txOverallStatus[overallStatus(record)]} icon={Clock01Icon} tone="amber" />
      <Button asChild size="sm">
        <Link href={routeTo.checkout(record.params.campaignId)}>{purchaseCopy.list.finish}</Link>
      </Button>
    </li>
  );
}

export function InProgressStrip({
  mode,
  account,
  listed,
}: {
  mode: Mode;
  account: string | null;
  listed: ReadonlySet<string>;
}) {
  const records = useTxStore((state) => state.records);
  if (!account) return null;
  const open = records
    .filter(isOpenPurchase)
    .filter(
      (record) =>
        record.mode === mode &&
        record.account.toLowerCase() === account.toLowerCase() &&
        !listed.has(record.params.campaignId),
    )
    .filter(
      (record, index, all) =>
        all.findIndex((other) => other.params.campaignId === record.params.campaignId) === index,
    );
  if (open.length === 0) return null;
  return (
    <Card className="bg-amber-soft/40 flex flex-col gap-3">
      <div>
        <h2 className="text-ink font-medium">{purchaseCopy.list.inProgressTitle}</h2>
        <p className="text-subtle text-sm">{purchaseCopy.list.inProgressCaption}</p>
      </div>
      <ul className="divide-hairline divide-y">
        {open.map((record) => (
          <Row key={record.id} record={record} />
        ))}
      </ul>
    </Card>
  );
}
