"use client";

import {
  ArrowTurnBackwardIcon,
  Clock01Icon,
  MoneyReceive01Icon,
  Rocket01Icon,
  TimeQuarterPassIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { demoToken } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { overviewPageCopy as copy } from "../copy/overview";
import { useLaunchRecordId } from "../shared/campaign-actions";
import type { MerchantCampaignRow } from "../shared/campaign-rules";
import { openClaimProceeds, proceedsCampaigns } from "../shared/settle";
import { campaignAlerts, dayMs, plural } from "./alert-items";

const ui = useUiStore.getState;

function FinishLaunch({ row }: { row: MerchantCampaignRow & { campaignId: string } }) {
  const id = useLaunchRecordId(row.campaignId);
  return id ? (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        ui().open("M-11", { txId: id });
      }}
    >
      {copy.actions.finish}
    </Button>
  ) : (
    <Button asChild size="sm" variant="secondary">
      <Link href={routeTo.sellCampaign(row.campaignId)}>{copy.actions.open}</Link>
    </Button>
  );
}

export function OverviewAlerts({
  campaigns,
  now,
}: {
  campaigns: readonly MerchantCampaignRow[];
  now: number;
}) {
  const vault = useClientQuery("vault.get", {});
  const pending = useClientQuery("receipts.forMerchant", { state: "PENDING", limit: 100 });
  const requests = useClientQuery("disputes.list", { kind: "refund_request", status: "open" });
  const { alerts, unfinished } = campaignAlerts(campaigns, now);
  const openRequests = requests.data?.items ?? [];
  if (openRequests.length > 0)
    alerts.push({
      key: "refunds",
      icon: ArrowTurnBackwardIcon,
      tone: "text-pink-ink",
      text: plural(openRequests.length, copy.alerts.refundOne, copy.alerts.refund),
      action: {
        label: copy.actions.review,
        href:
          openRequests.length === 1 && openRequests[0]
            ? routeTo.sale(openRequests[0].saleId)
            : "/sell/sales?state=pending",
      },
    });
  const rows = pending.data?.items ?? [];
  const maturing = rows.filter((row) => {
    const unlock = Date.parse(row.unlockAt);
    return unlock > now && unlock <= now + dayMs;
  }).length;
  const ready = rows.filter((row) => Date.parse(row.unlockAt) <= now).length;
  if (maturing > 0)
    alerts.push({
      key: "maturing",
      icon: Clock01Icon,
      tone: "text-amber-ink",
      text: plural(maturing, copy.alerts.maturingOne, copy.alerts.maturing),
      action: { label: copy.actions.seeSales, href: "/sell/sales?state=pending&maturing=24h" },
    });
  if (ready > 0)
    alerts.push({
      key: "ready",
      icon: TimeQuarterPassIcon,
      tone: "text-sky-ink",
      text: plural(ready, copy.alerts.readyOne, copy.alerts.ready),
      action: { label: copy.actions.finalize, href: "/sell/sales?state=pending&matured=1" },
    });
  const entries = vault.data?.campaigns ?? [];
  const claimable = entries.reduce(
    (sum, entry) => sum + BigInt(entry.proceeds.proceedsClaimable),
    0n,
  );
  if (proceedsCampaigns(entries).length > 0 && claimable > 0n)
    alerts.push({
      key: "proceeds",
      icon: MoneyReceive01Icon,
      tone: "text-lime-ink",
      text: fill(copy.alerts.proceeds, {
        amount: formatAmount(claimable, vault.data?.totals[0]?.token ?? demoToken),
      }),
      action: {
        label: copy.actions.claim,
        run: () => {
          openClaimProceeds(entries);
        },
      },
    });
  if (alerts.length === 0 && unfinished.length === 0) return null;
  return (
    <Card padding="none" className="overflow-hidden">
      <h2 className="text-ink px-5 pt-4 pb-2 font-medium">{copy.alertsTitle}</h2>
      <ul className="divide-hairline divide-y">
        {unfinished.map((row) => (
          <li
            key={`launch-${row.campaignId}`}
            className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-body flex items-start gap-3 text-sm">
              <HugeiconsIcon
                icon={Rocket01Icon}
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
                className="text-amber-ink mt-px shrink-0"
              />
              {fill(
                merchantRowStateKey(row) === "notFunded"
                  ? copy.alerts.notFunded
                  : copy.alerts.notLiveYet,
                { campaign: row.productTitle },
              )}
            </p>
            <FinishLaunch row={row} />
          </li>
        ))}
        {alerts.map((alert) => (
          <li
            key={alert.key}
            className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-body flex items-start gap-3 text-sm">
              <HugeiconsIcon
                icon={alert.icon}
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
                className={`mt-px shrink-0 ${alert.tone}`}
              />
              {alert.text}
            </p>
            {"href" in alert.action ? (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="shrink-0 self-start sm:self-auto"
              >
                <Link href={alert.action.href}>{alert.action.label}</Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 self-start sm:self-auto"
                onClick={alert.action.run}
              >
                {alert.action.label}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
