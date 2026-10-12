"use client";

import { common } from "@/lib/copy";
import { useClientContext } from "@/lib/client/provider";
import { useState } from "react";
import { parseUnits } from "viem";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useClientQuery } from "@/lib/query/use-client";
import { useChainAction } from "@/lib/tx/use-action";
import { formatAmount } from "@/lib/format";

const rewardsLabels = {
  netDeposited: "Deposited",
  available: "Available",
  pendingReserved: "Reserved for pending sales",
  vestedUnclaimed: "Owed to distributors",
  rewardsClaimed: "Claimed by distributors",
  surplusWithdrawn: "Withdrawn by you",
};
const proceedsLabels = {
  proceedsPending: "Held until the hold ends",
  proceedsClaimable: "Ready to claim",
  proceedsClaimed: "Claimed",
  buyerRefunded: "Refunded to buyers",
};

export function VaultPage({ campaignId }: { campaignId?: string }) {
  const { mode } = useClientContext();
  const vault = useClientQuery("vault.get", campaignId ? { campaignId } : {}, {
    refetchInterval: 10_000,
  });
  const campaigns = useClientQuery("campaigns.mine", {});
  const start = useChainAction();
  const [amount, setAmount] = useState("100");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fund = (id: string, name: string) => {
    try {
      const value = parseUnits(amount, 6);
      if (value <= 0n) throw new Error("Invalid amount");
      start("fundCampaign", { campaignId: id, campaignName: name, amount: value.toString() });
      setError(null);
    } catch {
      setError("Enter a valid positive SDUSD amount with at most six decimal places.");
    }
  };
  return (
    <ProductPage
      title="Your vault"
      description="Reward budgets and buyer proceeds are separate ledgers. Pausing or ending a campaign never blocks refunds, finalization or claims."
      actions={<PageLink href="/sell/sales">View sales</PageLink>}
    >
      <QueryState pending={vault.isPending} error={vault.error} retry={() => void vault.refetch()}>
        <div className="space-y-5">
          {vault.data?.campaigns.map((row) => {
            const campaign = campaigns.data?.items.find(
              (item) => item.campaignId === row.campaignId,
            );
            const name = campaign?.productTitle ?? `Campaign #${row.campaignId}`;
            const active = campaign?.state === "FUNDED_ACTIVE";
            const terminal = campaign?.state === "ENDED" || campaign?.state === "EXPIRED";
            return (
              <Card key={row.campaignId}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-h4">{name}</h2>
                  <PageLink href={`/sell/campaigns/${row.campaignId}`}>Campaign</PageLink>
                </div>
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-3 font-medium">Reward budget</h3>
                    <dl className="space-y-2 text-sm">
                      {Object.entries(rewardsLabels).map(([key, label]) => (
                        <div key={key} className="flex flex-wrap justify-between gap-2">
                          <dt className="text-subtle">{label}</dt>
                          <dd className="font-mono">
                            {formatAmount(
                              BigInt(row.rewards[key as keyof typeof row.rewards]),
                              row.token,
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div>
                    <h3 className="mb-3 font-medium">Buyer proceeds</h3>
                    <dl className="space-y-2 text-sm">
                      {Object.entries(proceedsLabels).map(([key, label]) => (
                        <div key={key} className="flex flex-wrap justify-between gap-2">
                          <dt className="text-subtle">{label}</dt>
                          <dd className="font-mono">
                            {formatAmount(
                              BigInt(row.proceeds[key as keyof typeof row.proceeds]),
                              row.token,
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <div className="border-hairline mt-5 space-y-4 border-t pt-5">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Add reward budget (SDUSD)">
                      <Input
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value);
                        }}
                        inputMode="decimal"
                        className="max-w-48"
                      />
                    </Field>
                    <Button
                      onClick={() => {
                        fund(row.campaignId, name);
                      }}
                    >
                      Add budget
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={
                        BigInt(row.proceeds.proceedsClaimable) === 0n &&
                        row.settledSalesReadyToFinalize.length === 0
                      }
                      onClick={() => {
                        start("claimProceeds", {
                          campaignIds: [row.campaignId],
                          campaignName: name,
                          amount: row.proceeds.proceedsClaimable,
                          finalizeSaleIds: row.settledSalesReadyToFinalize.slice(0, 10),
                        });
                      }}
                    >
                      {row.settledSalesReadyToFinalize.length
                        ? "Finalize up to 10 and claim proceeds"
                        : "Claim proceeds"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={terminal}
                      onClick={() => {
                        start(active ? "pause" : "resume", {
                          campaignId: row.campaignId,
                          campaignName: name,
                        });
                      }}
                    >
                      {active ? "Pause campaign" : "Resume campaign"}
                    </Button>
                    <Button
                      variant="danger"
                      disabled={terminal}
                      onClick={() => {
                        setConfirm(`end:${row.campaignId}`);
                      }}
                    >
                      End campaign
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={active || BigInt(row.rewards.available) === 0n}
                      disabledReason="Pause or end this campaign before withdrawing its unused budget."
                      onClick={() => {
                        setConfirm(`withdraw:${row.campaignId}`);
                      }}
                    >
                      Withdraw unused budget
                    </Button>
                  </div>
                  {confirm?.endsWith(`:${row.campaignId}`) ? (
                    <div className="bg-amber-soft rounded-xl p-4">
                      <p>
                        {confirm.startsWith("end:")
                          ? "End this campaign permanently? Existing refunds, finalization and claims remain available."
                          : "Withdraw all unused rewards? Reserved and owed rewards stay protected in the contract."}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (confirm.startsWith("end:"))
                              start("end", { campaignId: row.campaignId, campaignName: name });
                            else
                              start("withdrawUnused", {
                                campaignId: row.campaignId,
                                campaignName: name,
                                amount: row.rewards.available,
                              });
                            setConfirm(null);
                          }}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setConfirm(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
          {vault.data?.campaigns.length === 0 ? (
            <Card>
              <p>No campaign ledgers yet. Launch a campaign to fund its separate reward budget.</p>
            </Card>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-pink-ink">
            {error}
          </p>
        ) : null}
        <p className="text-subtle text-xs">
          {mode === "demo"
            ? common.simulated
            : `Contract balances read at block ${vault.data?.blockNumber ?? "unavailable"} · Index through ${vault.data?.lastIndexedBlock ?? "unavailable"}`}
        </p>
      </QueryState>
    </ProductPage>
  );
}
