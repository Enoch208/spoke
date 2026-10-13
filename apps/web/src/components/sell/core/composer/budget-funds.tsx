"use client";

import { Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { formatAmount, formatMonBalance, type TokenLike } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { composerCopy } from "./copy";

const copy = composerCopy.budget;

export type Balances = { readonly tokenMinor: bigint | null; readonly monWei: bigint | null };

export function WalletBalances({
  balances,
  token,
  needMinor,
}: {
  balances: Balances;
  token: TokenLike;
  needMinor: bigint | null;
}) {
  const open = useUiStore((state) => state.open);
  return (
    <div className="bg-soft flex flex-wrap items-center gap-4 rounded-2xl px-4 py-3">
      <HugeiconsIcon
        icon={Wallet01Icon}
        size={20}
        strokeWidth={1.8}
        className="text-subtle"
        aria-hidden="true"
      />
      <dl className="flex flex-1 flex-wrap gap-x-6 gap-y-1">
        <div>
          <dt className="text-subtle text-xs">{fill(copy.sdusd, { symbol: token.symbol })}</dt>
          <dd className="text-ink font-mono text-sm tabular-nums">
            {balances.tokenMinor === null
              ? copy.unavailable
              : formatAmount(balances.tokenMinor, token)}
          </dd>
        </div>
        <div>
          <dt className="text-subtle text-xs">{copy.mon}</dt>
          <dd className="text-ink font-mono text-sm tabular-nums">
            {balances.monWei === null ? copy.unavailable : formatMonBalance(balances.monWei)}
          </dd>
        </div>
      </dl>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          open("M-06", {
            context: "composer",
            ...(needMinor !== null ? { needSdusdMinor: needMinor.toString() } : {}),
          });
        }}
      >
        {copy.getFunds}
      </Button>
    </div>
  );
}
