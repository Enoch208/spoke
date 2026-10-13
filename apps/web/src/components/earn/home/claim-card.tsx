"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/lib/client/provider";
import { fill, txOverallStatus } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { isActive, overallStatus } from "@/lib/tx/records";
import { homeCopy } from "../copy/home";
import { sameAddress } from "../shared/viewer";

const copy = homeCopy.claim;

export function ClaimCard() {
  const { mode } = useClientContext();
  const open = useUiStore((state) => state.open);
  const claimable = useClientQuery("earnings.claimable", {}, { refetchInterval: 10_000 });
  const funding = useClientQuery("funding.status", {}, { enabled: mode === "live" });
  const records = useTxStore((state) => state.records);
  const row = claimable.data?.tokens.find((item) => BigInt(item.amount) > 0n);
  if (!row) return null;
  const ready = (claimable.data?.readyToFinalize ?? []).filter((sale) =>
    sameAddress(sale.token.address, row.token.address),
  );
  const readyAmount = ready.reduce((sum, sale) => sum + BigInt(sale.amount), 0n);
  const running = records.find(
    (record) =>
      record.kind === "claimRewards" &&
      sameAddress(record.params.token, row.token.address) &&
      isActive(record),
  );
  const amount = formatAmount(BigInt(row.amount), row.token);
  const needsFunds = funding.data?.covers?.claimRewards === false;
  return (
    <section className="bg-lime-soft grid gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-2xl tabular-nums sm:text-3xl">
            {formatAmount(BigInt(row.amount), row.token, { testnet: true })}
          </span>
          <span className="text-lime-ink text-sm">{copy.ready}</span>
        </p>
        {needsFunds ? (
          <Button className="max-sm:w-full" onClick={() => open("M-06", {})}>
            {copy.funds}
          </Button>
        ) : (
          <Button
            className="max-sm:w-full"
            disabled={running !== undefined}
            {...(running ? { disabledReason: txOverallStatus[overallStatus(running)] } : {})}
            onClick={() => open("M-21", { source: "REWARD", token: row.token.address })}
          >
            {running ? copy.inProgress : fill(copy.action, { amount })}
          </Button>
        )}
      </div>
      {ready.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body text-sm">
            {fill(ready.length === 1 ? copy.finalizeOne : copy.finalizeLine, {
              n: String(ready.length),
              amount: formatAmount(readyAmount, row.token),
            })}
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/earn/payouts#finalize">{copy.finalize}</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
