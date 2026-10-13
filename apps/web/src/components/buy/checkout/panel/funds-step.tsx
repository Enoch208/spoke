"use client";

import { Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { demoToken } from "@spoke/protocol";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { formatAmount, formatMonBalance, formatRelative } from "@/lib/format";
import { useClientMutation } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useChainAction } from "@/lib/tx/use-action";
import { stepCopy } from "../../copy/steps";
import type { Checkout } from "../use-checkout";

const copy = stepCopy.funds;

const faucetPlan = (shortfall: bigint, limit: bigint, decimals: number) => {
  const unit = 10n ** BigInt(decimals);
  const whole = ((shortfall + unit - 1n) / unit) * unit;
  const amount = whole < limit ? whole : limit;
  const total = limit > 0n ? (whole + limit - 1n) / limit : 1n;
  return { amount, total };
};

function Row({
  title,
  line,
  ready,
  children,
}: {
  title: string;
  line: string;
  ready: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink font-medium">{title}</p>
        <StatusChip
          label={ready ? copy.ready : copy.needed}
          icon={ready ? Tick02Icon : Alert02Icon}
          tone={ready ? "lime" : "amber"}
        />
      </div>
      <p className="text-body text-sm">{line}</p>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </li>
  );
}

export function FundsStep({ checkout }: { checkout: Checkout }) {
  const start = useChainAction();
  const drip = useClientMutation("funding.requestGas", ["funding.status", "checkout.preview"]);
  const campaign = checkout.campaign.data;
  const funding = checkout.funding.data;
  if (!campaign) return null;
  const token = campaign.token;
  const demo = checkout.mode === "demo";
  const balance = checkout.tokenBalance ?? 0n;
  const shortfall = checkout.price > balance ? checkout.price - balance : 0n;
  const faucetable = token.symbol === demoToken.symbol;
  const limit = BigInt(funding?.faucetLimit ?? "0");
  const plan = faucetPlan(shortfall, limit, token.decimals);
  const gasState = funding?.gas.state;
  const nextEligible = funding?.gas.nextEligibleAt;
  const gasLine =
    gasState === "already_received" || gasState === "device_limit"
      ? fill(copy.gasRateLimited, {
          nextEligible: nextEligible ? formatRelative(new Date(nextEligible)) : "later",
        })
      : gasState === "station_empty" || gasState === "unavailable" || gasState === "failed"
        ? copy.gasDown
        : null;
  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-hairline divide-y">
        <Row
          title={copy.monTitle}
          ready={checkout.monReady}
          line={fill(copy.monLine, { mon: formatMonBalance(checkout.monWei ?? 0n) })}
        >
          {checkout.monReady ? null : gasState === "eligible" || gasState === "sending" ? (
            <Button
              variant="secondary"
              loading={drip.isPending || gasState === "sending"}
              onClick={() => {
                drip.mutate({});
              }}
            >
              {copy.getMon}
            </Button>
          ) : demo ? null : (
            <>
              <Button variant="secondary" asChild>
                <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">
                  {copy.faucetLink}
                </a>
              </Button>
              <Button variant="ghost" onClick={() => void checkout.funding.refetch()}>
                {copy.addedMon}
              </Button>
            </>
          )}
        </Row>
        <Row
          title={fill(copy.tokenTitle, { symbol: token.symbol })}
          ready={checkout.tokenReady}
          line={fill(copy.tokenLine, {
            balance: formatAmount(balance, token),
            price: formatAmount(checkout.price, token),
          })}
        >
          {checkout.tokenReady ? null : faucetable && plan.amount > 0n ? (
            <Button
              variant="secondary"
              disabled={!checkout.monReady}
              disabledReason={copy.needsMonFirst}
              onClick={() => {
                start("mintDemoTokens", { amount: plan.amount.toString() });
              }}
            >
              {plan.total > 1n
                ? fill(copy.getTokenPart, {
                    amount: formatAmount(plan.amount, token),
                    part: "1",
                    total: plan.total.toString(),
                  })
                : fill(copy.getToken, { amount: formatAmount(plan.amount, token) })}
            </Button>
          ) : null}
        </Row>
      </ul>
      {!checkout.monReady && !checkout.tokenReady && faucetable ? (
        <p className="text-subtle text-sm">{copy.needsMonFirst}</p>
      ) : null}
      {!faucetable && !checkout.tokenReady ? (
        <div className="bg-amber-soft flex flex-col items-start gap-2 rounded-xl p-3 text-sm">
          <p className="text-amber-ink">
            {fill(demo ? copy.noFaucetDemo : copy.noFaucet, { symbol: token.symbol })}
          </p>
          <Link href={routes.explore} className="text-ink font-medium underline underline-offset-2">
            {copy.explore}
          </Link>
        </div>
      ) : null}
      {gasLine && !checkout.monReady ? <p className="text-body text-sm">{gasLine}</p> : null}
      {drip.isSuccess ? (
        <p role="status" className="text-body text-sm">
          {copy.gasSent}
        </p>
      ) : null}
      <p className="text-subtle text-sm">{copy.footer}</p>
    </div>
  );
}
