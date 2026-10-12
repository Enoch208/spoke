"use client";

import type { ClientOutput } from "@spoke/protocol";
import { protocolLimits } from "@spoke/protocol";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatAmount, formatCount } from "@/lib/format";
import { asAddress } from "@/lib/tx/calls";
import { useClientQuery } from "@/lib/query/use-client";
import { claimDialog } from "../copy/settlement";
import { DialogError } from "../shared/dialog-states";
import { useStartTx } from "../shared/use-start";
import { sameAddress } from "../shared/viewer";
import { ClaimFrame } from "./claim-frame";

type Claimable = ClientOutput<"earnings.claimable">;

const plan = (data: Claimable | undefined, token: string, includeReady: boolean) => {
  const row = data?.tokens.find((candidate) => sameAddress(candidate.token.address, token));
  const ready = (data?.readyToFinalize ?? [])
    .filter((sale) => sameAddress(sale.token.address, token))
    .sort((a, b) => a.unlockAt.localeCompare(b.unlockAt))
    .slice(0, protocolLimits.maxBatchFinalize);
  const finalizing = includeReady ? ready : [];
  const now = BigInt(row?.amount ?? "0");
  const extra = finalizing.reduce((sum, sale) => sum + BigInt(sale.amount), 0n);
  return { row, ready, finalizing, now, total: now + extra };
};

export function ClaimRewards({
  token,
  isTop,
  close,
}: {
  token: string;
  isTop: boolean;
  close: () => void;
}) {
  const { mode } = useClientContext();
  const start = useStartTx();
  const primary = useRef<HTMLButtonElement>(null);
  const [includeReady, setIncludeReady] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const claimable = useClientQuery("earnings.claimable", { token });
  const summary = useClientQuery("earnings.summary", { token });
  const titles = useClientQuery("earnings.byCampaign", {});
  const funding = useClientQuery("funding.status", {}, { enabled: mode === "live" });
  const current = plan(claimable.data, token, includeReady);
  const tokenInfo = current.row?.token ?? current.ready[0]?.token;
  const money = (value: bigint, testnet = false) =>
    tokenInfo ? formatAmount(value, tokenInfo, { testnet }) : "";
  const titleOf = (campaignId: string) =>
    titles.data?.find((row) => row.campaignId === campaignId)?.productTitle ?? `#${campaignId}`;
  const atRisk = summary.data?.tokens.find((row) => sameAddress(row.token.address, token))?.atRisk;
  const nothing = current.total === 0n && current.ready.length === 0;

  const claim = async () => {
    setChecking(true);
    const fresh = plan((await claimable.refetch()).data, token, includeReady);
    setChecking(false);
    if (fresh.total !== current.total) {
      setNotice(fill(claimDialog.changed, { amount: money(fresh.total) }));
      return;
    }
    const txId = start("claimRewards", {
      token: asAddress(token),
      amount: fresh.total.toString(),
      finalizeSaleIds: fresh.finalizing.map((sale) => sale.saleId),
    });
    if (txId) close();
  };

  if (claimable.error)
    return (
      <ClaimFrame
        title={claimDialog.rewardTitle}
        isTop={isTop}
        close={close}
        primaryRef={primary}
        amount=""
        lines={[]}
        notes={[]}
        nothing={null}
        pendingHref="/earn/earnings"
        notice={null}
        needsFunds={false}
        primary={null}
      >
        <DialogError error={claimable.error} retry={() => void claimable.refetch()} />
      </ClaimFrame>
    );

  const n = String(current.finalizing.length);
  const label =
    current.finalizing.length > 0
      ? fill(claimDialog.primaryWithFinalize, { n, amount: money(current.total) })
      : fill(claimDialog.primary, { amount: money(current.total) });

  return (
    <ClaimFrame
      title={claimDialog.rewardTitle}
      isTop={isTop}
      close={close}
      primaryRef={primary}
      amount={claimable.isPending ? <Skeleton className="h-9 w-56" /> : money(current.total, true)}
      lines={[
        ...(current.row?.campaigns ?? []).map((campaign) => ({
          key: campaign.campaignId,
          label: titleOf(campaign.campaignId),
          amount: money(BigInt(campaign.amount)),
        })),
        ...current.finalizing.map((sale) => ({
          key: `ready-${sale.saleId}`,
          label: fill(claimDialog.finalizesFirst, { saleId: sale.saleId }),
          amount: money(BigInt(sale.amount)),
        })),
      ]}
      notes={[
        atRisk && BigInt(atRisk) > 0n
          ? fill(claimDialog.rewardNote, { pendingAmount: money(BigInt(atRisk)) })
          : claimDialog.rewardNoteNone,
        claimDialog.wholeBalance,
        ...(mode === "live" && claimable.data
          ? [
              fill(claimDialog.readFromChain, {
                block: formatCount(BigInt(claimable.data.blockNumber)),
              }),
            ]
          : []),
      ]}
      nothing={claimable.data && nothing ? claimDialog.nothing : null}
      pendingHref="/earn/earnings"
      notice={notice}
      needsFunds={funding.data?.covers?.claimRewards === false}
      primary={
        <Button
          ref={primary}
          disabled={claimable.isPending || current.total === 0n}
          loading={checking}
          loadingLabel={claimDialog.checking}
          aria-label={label}
          onClick={() => void claim()}
        >
          {label}
        </Button>
      }
    >
      {current.ready.length > 0 ? (
        <Checkbox
          checked={includeReady}
          onCheckedChange={(checked) => {
            setIncludeReady(checked);
            setNotice(null);
          }}
          label={fill(claimDialog.includeReady, { n: String(current.ready.length) })}
          description={claimDialog.includeReadyHelp}
        />
      ) : null}
    </ClaimFrame>
  );
}
