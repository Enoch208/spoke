"use client";

import { demoToken } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/lib/client/provider";
import { common, fill, txOverallStatus } from "@/lib/copy";
import { formatAmount, formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { isActive, overallStatus } from "@/lib/tx/records";
import { payoutsCopy } from "../copy/payouts";
import { DialogError } from "../shared/dialog-states";
import { Section } from "../shared/section";
import { sameAddress } from "../shared/viewer";

const copy = payoutsCopy.claim;

function useActiveClaim(token: string) {
  const records = useTxStore((state) => state.records);
  const record = records.find(
    (candidate) =>
      candidate.kind === "claimRewards" &&
      sameAddress(candidate.params.token, token) &&
      isActive(candidate),
  );
  return record ? overallStatus(record) : null;
}

function ClaimRow({
  token,
  amount,
  blockNumber,
  first,
}: {
  token: { address: string; symbol: string; decimals: number };
  amount: bigint;
  blockNumber: string;
  first: boolean;
}) {
  const { mode } = useClientContext();
  const open = useUiStore((state) => state.open);
  const running = useActiveClaim(token.address);
  const label = fill(copy.action, { amount: formatAmount(amount, token) });
  return (
    <div className="bg-lime-soft flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-ink flex flex-wrap items-center gap-2 font-mono text-2xl tabular-nums">
          {formatAmount(amount, token, { testnet: first })}
          {mode === "demo" && token.symbol !== demoToken.symbol ? (
            <Badge tone="lilac">{copy.demoToken}</Badge>
          ) : null}
        </p>
        <p className="text-lime-ink mt-1 text-sm">
          {mode === "demo"
            ? common.simulated
            : fill(copy.readAt, { block: formatCount(BigInt(blockNumber)) })}
        </p>
      </div>
      <Button
        className="max-sm:w-full"
        disabled={running !== null}
        {...(running ? { disabledReason: txOverallStatus[running] } : {})}
        aria-label={label}
        onClick={() => open("M-21", { source: "REWARD", token: token.address })}
      >
        {running ? copy.inProgress : label}
      </Button>
    </div>
  );
}

export function ClaimRows() {
  const claimable = useClientQuery("earnings.claimable", {}, { refetchInterval: 10_000 });
  const rows = (claimable.data?.tokens ?? []).filter((row) => BigInt(row.amount) > 0n);
  const ready = claimable.data?.readyToFinalize.length ?? 0;
  return (
    <Section
      id="claim"
      title={copy.title}
      className={
        rows.length === 1
          ? "max-sm:shadow-frame max-sm:sticky max-sm:top-16 max-sm:z-20"
          : undefined
      }
    >
      {claimable.isPending ? <Skeleton className="h-24 rounded-2xl" /> : null}
      {claimable.error ? (
        <DialogError error={claimable.error} retry={() => void claimable.refetch()} />
      ) : null}
      {claimable.data ? (
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <ClaimRow
              key={row.token.address}
              token={row.token}
              amount={BigInt(row.amount)}
              blockNumber={claimable.data.blockNumber}
              first={index === 0}
            />
          ))}
          {rows.length === 0 ? (
            <p className="text-body">
              {copy.empty}{" "}
              {ready > 0 ? (
                <a href="#finalize" className="text-ink underline underline-offset-2">
                  {copy.toFinalize}
                </a>
              ) : null}
            </p>
          ) : (
            <div className="text-subtle space-y-1 text-sm max-sm:hidden">
              <p>{copy.noteOne}</p>
              <p>{copy.noteTwo}</p>
            </div>
          )}
        </div>
      ) : null}
    </Section>
  );
}
