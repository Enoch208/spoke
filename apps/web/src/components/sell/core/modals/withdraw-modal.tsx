"use client";

import { useRef } from "react";
import { Address } from "@/components/ui/address";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { useChainAction } from "@/lib/tx/use-action";
import { activeChain } from "@/lib/wagmi";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { withdrawCopy as copy } from "../copy/dialogs";
import { Callout } from "../shared/callout";
import { useCampaignMoney, useIsDemo } from "../shared/hooks";
import { BigAmount, DialogBadge, DialogSkeleton, FeeNote, LedgerLines } from "./parts";

export default function WithdrawModal({ props, isTop, close }: ModalComponentProps<"M-24">) {
  const money = useCampaignMoney(props.campaignId);
  const demo = useIsDemo();
  const start = useChainAction();
  const primary = useRef<HTMLButtonElement>(null);
  const { buckets, campaign, stateKey } = money;
  const token = campaign.data?.token;
  const live = stateKey === "live" || stateKey === "exhausted";
  const paused = stateKey === "paused";
  const available = buckets?.available ?? 0n;
  const canWithdraw = !live && available > 0n && !money.pending;
  const openNext = (next: "M-25" | "M-26") => {
    close();
    if (next === "M-25")
      useUiStore.getState().open("M-25", { campaignId: props.campaignId, mode: "pause" });
    else useUiStore.getState().open("M-26", { campaignId: props.campaignId });
  };
  const withdraw = () => {
    if (!money.name) return;
    close();
    start("withdrawUnused", {
      campaignId: props.campaignId,
      campaignName: money.name,
      amount: available.toString(),
    });
  };
  return (
    <Dialog
      open
      size="md"
      inert={!isTop}
      initialFocus={primary}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={copy.title}
      subtitle={money.name ?? undefined}
      badge={<DialogBadge />}
      footer={
        live ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                openNext("M-26");
              }}
            >
              {copy.end}
            </Button>
            <Button
              ref={primary}
              onClick={() => {
                openNext("M-25");
              }}
            >
              {copy.pause}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            {canWithdraw && token ? (
              <Button ref={primary} onClick={withdraw}>
                {fill(copy.primary, { amount: formatAmount(available, token) })}
              </Button>
            ) : null}
          </>
        )
      }
    >
      {money.pending || !buckets || !token || !campaign.data ? (
        <DialogSkeleton />
      ) : (
        <div className="space-y-5">
          <p className="text-body">{copy.body}</p>
          {live ? <Callout tone="caution">{copy.live}</Callout> : null}
          {!live && available === 0n ? <Callout tone="info">{copy.nothing}</Callout> : null}
          <BigAmount label={copy.available}>
            {formatAmount(available, token, { testnet: true })}
          </BigAmount>
          <div>
            <h3 className="text-ink mb-2 text-sm font-medium">{copy.staying}</h3>
            <LedgerLines
              rows={[
                {
                  key: "reserved",
                  label: copy.reserved,
                  value: formatAmount(buckets.pendingReserved, token),
                },
                {
                  key: "owed",
                  label: copy.owed,
                  value: formatAmount(buckets.vestedUnclaimed, token),
                },
              ]}
            />
          </div>
          {canWithdraw ? (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-subtle">{copy.sentTo}</span>
                <Address
                  address={campaign.data.merchant.address}
                  chainId={activeChain.id}
                  demo={demo}
                  showAddress
                />
                <span className="text-subtle">· {copy.thisAccount}</span>
              </div>
              {paused ? (
                <Callout tone="caution">
                  {fill(copy.paused, { available: formatAmount(available, token) })}
                </Callout>
              ) : null}
              <p className="text-subtle text-sm">{copy.later}</p>
              <FeeNote />
            </>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
