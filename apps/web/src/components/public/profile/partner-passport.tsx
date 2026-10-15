"use client";

import Link from "next/link";
import { useState } from "react";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { receiptHref, routes, routeTo } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";
import type { AnyProfile } from "./types";

export function PartnerPassport({ profile, owner }: { profile: AnyProfile; owner: boolean }) {
  const passport = profile.passport;
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  if (!passport) return null;
  const history = passport.history.slice(-12);
  const max = Math.max(1, ...history.map((point) => point.direct + point.network));
  const selected = history.find((point) => point.month === selectedMonth) ?? history.at(-1);
  return (
    <section aria-label="Partner Passport" className="grid min-w-0 gap-5">
      <div>
        <p className="text-subtle text-xs font-medium uppercase tracking-widest">
          Partner Passport
        </p>
        <h2 className="font-display text-h4 mt-2">
          A record you can take to your next partnership
        </h2>
        <p className="text-subtle mt-2 max-w-[70ch] text-sm">
          Finalized sales build this record. Pending purchases and refunds never count as settled
          contributions. Amounts use SDUSD on Monad Testnet.
        </p>
      </div>
      {history.length === 0 ? (
        <Card className="grid gap-3">
          <h3 className="font-medium">Every partnership starts with a first recommendation</h3>
          <p className="text-subtle text-sm">
            There are no settled sales yet. This means there is no performance history to evaluate.
            Join a campaign, share your link, and your first finalized sale will appear here with
            its receipt.
          </p>
          {owner ? (
            <Button asChild variant="secondary" className="w-fit">
              <Link href={routes.earn.opportunities}>Find your first campaign</Link>
            </Button>
          ) : null}
        </Card>
      ) : (
        <Card className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-medium">Settled contributions over time</h3>
            <p className="text-subtle text-xs">
              By settlement month · UTC · latest 12 active months
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <span>● Direct sales</span>
            <span className="text-subtle">● Network sales</span>
          </div>
          <div className="flex h-44 items-end gap-3 overflow-x-auto pb-1">
            {history.map((point) => (
              <button
                key={point.month}
                type="button"
                onClick={() => {
                  setSelectedMonth(point.month);
                }}
                aria-pressed={point.month === selected?.month}
                aria-label={`${point.month}: ${String(point.direct)} direct and ${String(point.network)} network sales; show receipts`}
                className="group flex h-full min-w-14 flex-1 flex-col justify-end gap-2 rounded-lg px-1 focus-visible:outline-2"
              >
                <span className="text-subtle text-xs tabular-nums">
                  {point.direct + point.network}
                </span>
                <span
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t-lg"
                  style={{
                    height: `${String(Math.max(8, ((point.direct + point.network) / max) * 100))}%`,
                  }}
                >
                  <span className="bg-lime-300" style={{ flex: point.network }} />
                  <span className="bg-ink" style={{ flex: point.direct }} />
                </span>
                <span className="text-subtle whitespace-nowrap text-xs">{point.month}</span>
              </button>
            ))}
          </div>
          {selected ? (
            <div className="border-hairline grid gap-2 border-t pt-4" aria-live="polite">
              <p className="text-sm">
                {selected.month}: {selected.direct} direct · {selected.network} network
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {selected.receiptIds.map((id) => (
                  <Link
                    key={id}
                    href={receiptHref(id, activeChain.id)}
                    className="text-sm underline underline-offset-4"
                  >
                    Receipt #{id}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-subtle text-xs">
            One sale can credit several people along its referral path. These are contributions, not
            unique sales across all passports.
          </p>
        </Card>
      )}
      {passport.rewards && owner ? (
        <Card className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-subtle mb-2 text-sm">Ready to claim</p>
            <Amount
              amount={BigInt(passport.rewards.claimable)}
              token={passport.rewards.token}
              testnet
            />
          </div>
          <div>
            <p className="text-subtle mb-2 text-sm">Previously claimed</p>
            <Amount
              amount={BigInt(passport.rewards.claimed)}
              token={passport.rewards.token}
              testnet
            />
          </div>
          <div className="grid content-center gap-2">
            <Button asChild variant="secondary">
              <Link href={routes.earn.earnings}>Review rewards and claim</Link>
            </Button>
            <p className="text-subtle text-xs">
              Only you can see these balances on your passport. Claims are checked against the
              contract.
            </p>
          </div>
        </Card>
      ) : null}
      {passport.positions.length ? (
        <Card className="grid gap-4">
          <div>
            <h3 className="font-medium">Campaigns and network positions</h3>
            <p className="text-subtle mt-1 text-sm">
              Participation is separate from completed sales. Open a network to inspect the
              introduction path and reward allocations.
            </p>
          </div>
          <ul className="divide-hairline divide-y">
            {passport.positions.map((position) => (
              <li
                key={position.nodeId}
                className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <Link
                    href={routeTo.campaign(position.campaignId)}
                    className="font-medium break-words hover:underline"
                  >
                    {position.title}
                  </Link>
                  <p className="text-subtle mt-1 text-sm">
                    {position.direct} direct · {position.network} network sales · joined{" "}
                    {position.joinedAt.slice(0, 10)}
                  </p>
                  <p className="text-subtle mt-1 text-xs">
                    {position.parentNodeId === "0"
                      ? "Introduced directly by the merchant"
                      : `Introduced through link #${position.parentNodeId}`}
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link
                    href={`${routeTo.campaignNetwork(position.campaignId)}?node=${position.nodeId}`}
                  >
                    View position #{position.nodeId}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </section>
  );
}
