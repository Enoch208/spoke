"use client";

import { useRef, useState } from "react";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fill, vaultRewardCopy } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { useChainAction } from "@/lib/tx/use-action";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { addBudgetCopy as copy } from "../copy/dialogs";
import { Callout } from "../shared/callout";
import { useCampaignMoney } from "../shared/hooks";
import { fullRewardsCovered, roomUnderLimit } from "../shared/ledger";
import { DialogBadge, DialogSkeleton, FeeNote, LedgerLines } from "./parts";
import { maxTopUp, parseTopUp, type TopUpLimits } from "./top-up";

export default function AddBudgetModal({ props, isTop, close }: ModalComponentProps<"M-23">) {
  const money = useCampaignMoney(props.campaignId);
  const funding = useClientQuery("funding.status", {});
  const start = useChainAction();
  const field = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { entry, buckets, campaign, stateKey, reward } = money;
  const token = campaign.data?.token;
  const ended = stateKey === "ended" || stateKey === "expired";
  const limits: TopUpLimits | null =
    entry && buckets && token
      ? {
          token,
          balance: funding.data?.sdusd ? BigInt(funding.data.sdusd) : null,
          cap: BigInt(entry.liabilityCap),
          room: roomUnderLimit(BigInt(entry.liabilityCap), buckets),
        }
      : null;
  const check = limits ? parseTopUp(input, limits) : null;
  const error = check && !check.ok ? (check.error ?? (submitted ? copy.errors.empty : null)) : null;
  const value = check?.ok ? check.value : null;
  const capReached = limits !== null && limits.room === 0n;
  const allowance = funding.data?.sdusdAllowanceToProtocol
    ? BigInt(funding.data.sdusdAllowanceToProtocol)
    : 0n;
  const dismiss = () => {
    if (!input.trim()) {
      close();
      return;
    }
    useUiStore.getState().open("M-43", { subject: copy.discardSubject, onContinue: close });
  };
  const submit = () => {
    setSubmitted(true);
    if (!value || !money.name) {
      field.current?.focus();
      return;
    }
    close();
    start("fundCampaign", {
      campaignId: props.campaignId,
      campaignName: money.name,
      amount: value.toString(),
    });
  };
  const newAvailable = buckets && value ? buckets.available + value : null;
  const covered =
    newAvailable !== null && reward !== null ? fullRewardsCovered(newAvailable, reward) : null;
  const canAdd = !ended && !capReached && !money.pending;
  return (
    <Dialog
      open
      size="md"
      inert={!isTop}
      initialFocus={field}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
      title={copy.title}
      subtitle={money.name ?? undefined}
      badge={<DialogBadge />}
      footer={
        <>
          <Button variant="secondary" onClick={dismiss}>
            Cancel
          </Button>
          {canAdd ? (
            <Button onClick={submit}>
              {value && token
                ? fill(copy.primary, { amount: formatAmount(value, token) })
                : copy.primaryIdle}
            </Button>
          ) : null}
        </>
      }
    >
      {money.pending || !buckets || !token || !limits ? (
        <DialogSkeleton />
      ) : (
        <div className="space-y-5">
          {ended ? <Callout tone="caution">{copy.ended}</Callout> : null}
          {capReached && !ended ? (
            <Callout tone="caution">
              {fill(copy.capReached, { cap: formatAmount(limits.cap, token) })}
            </Callout>
          ) : null}
          <Callout tone="info">{copy.required}</Callout>
          <div>
            <h3 className="text-ink mb-2 text-sm font-medium">{copy.current}</h3>
            <LedgerLines
              rows={[
                {
                  key: "available",
                  label: vaultRewardCopy.available.label,
                  value: formatAmount(buckets.available, token, { testnet: true }),
                },
                {
                  key: "reserved",
                  label: vaultRewardCopy.pendingReserved.label,
                  value: formatAmount(buckets.pendingReserved, token),
                },
                {
                  key: "owed",
                  label: vaultRewardCopy.vestedUnclaimed.label,
                  value: formatAmount(buckets.vestedUnclaimed, token),
                },
                {
                  key: "claimed",
                  label: vaultRewardCopy.rewardsClaimed.label,
                  value: formatAmount(buckets.rewardsClaimed, token),
                },
              ]}
            />
          </div>
          {canAdd ? (
            <>
              <Field
                label={copy.amount}
                error={error}
                helper={fill(copy.room, { room: formatAmount(limits.room, token) })}
              >
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      ref={field}
                      value={input}
                      inputMode="decimal"
                      autoComplete="off"
                      mono
                      placeholder="0.00"
                      suffix={token.symbol}
                      onChange={(event) => {
                        setInput(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") submit();
                      }}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setInput(formatUnits(maxTopUp(limits), token.decimals));
                    }}
                  >
                    {copy.max}
                  </Button>
                </div>
              </Field>
              <p aria-live="polite" className="text-body text-sm">
                {newAvailable !== null
                  ? covered !== null && reward !== null
                    ? fill(copy.preview, {
                        newAvailable: formatAmount(newAvailable, token),
                        sales: covered.toString(),
                        reward: formatAmount(reward, token),
                      })
                    : fill(copy.previewNoReward, {
                        newAvailable: formatAmount(newAvailable, token),
                      })
                  : null}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-subtle">
                  {fill(copy.balance, {
                    balance: limits.balance === null ? "—" : formatAmount(limits.balance, token),
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    useUiStore.getState().open("M-06", {
                      ...(value ? { needSdusdMinor: value.toString() } : {}),
                      context: "fundCampaign",
                    });
                  }}
                >
                  {copy.getFunds}
                </Button>
              </div>
              <p className="text-subtle text-sm">
                {value !== null && allowance >= value ? copy.stepsOne : copy.stepsTwo}
              </p>
              <FeeNote />
            </>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
