"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClientQuery, useClientMutation } from "@/lib/query/use-client";
import { useChainAction } from "@/lib/tx/use-action";
import { formatAmount, formatMonBalance, formatRelative } from "@/lib/format";
import { demoToken, formatTokenAmount } from "@spoke/protocol";
import { fill, gasStateLines } from "@/lib/copy";
import { useModeStore } from "@/lib/stores/mode";

export function FundsPanel() {
  const funding = useClientQuery("funding.status", {}, { refetchInterval: 5000 });
  const drip = useClientMutation("funding.requestGas", ["funding.status", "account.balances"]);
  const start = useChainAction();
  const demo = useModeStore((state) => state.mode === "demo");
  const data = funding.data;
  return (
    <Card>
      <h2 className="font-display text-h4">Free test funds</h2>
      <p className="text-subtle mt-2 text-sm">
        MON pays network fees. SDUSD is the test token used for purchases and rewards. Neither has
        cash value.
      </p>
      {data ? (
        <>
          <div className="my-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-subtle text-xs">MON balance</p>
              <p className="font-mono break-words">{formatMonBalance(BigInt(data.monWei))}</p>
            </div>
            <div>
              <p className="text-subtle text-xs">SDUSD balance</p>
              <p className="font-mono break-words">
                {data.sdusd === null ? "Unavailable" : formatAmount(BigInt(data.sdusd), demoToken)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.gas.state === "eligible" ? (
              <Button
                variant="secondary"
                loading={drip.isPending}
                onClick={() => {
                  drip.mutate({});
                }}
              >
                Get test MON
              </Button>
            ) : demo ? null : (
              <Button variant="secondary" asChild>
                <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">
                  Monad MON faucet
                </a>
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={BigInt(data.monWei) === 0n}
              disabledReason="Needs MON for the network fee first."
              onClick={() => {
                start("mintDemoTokens", { amount: data.faucetLimit ?? "100000000" });
              }}
            >
              Get test SDUSD
            </Button>
            <Button variant="ghost" onClick={() => void funding.refetch()}>
              Refresh balances
            </Button>
          </div>
          <p className="text-subtle mt-3 text-xs">
            {fill(gasStateLines[data.gas.state], {
              amount: data.gas.dripAmount ? formatTokenAmount(BigInt(data.gas.dripAmount), 18) : "",
              nextRequestAt: data.gas.nextEligibleAt
                ? formatRelative(new Date(data.gas.nextEligibleAt))
                : "later",
            })}
          </p>
        </>
      ) : (
        <p className="text-subtle mt-3">{funding.error?.message ?? "Checking balances…"}</p>
      )}
      {drip.error ? (
        <p role="alert" className="text-pink-ink mt-3 text-sm">
          {drip.error.message}
        </p>
      ) : null}
      {drip.data ? (
        <p role="status" className="mt-3 text-sm">
          MON sent. Your balance will update after confirmation.
        </p>
      ) : null}
    </Card>
  );
}
