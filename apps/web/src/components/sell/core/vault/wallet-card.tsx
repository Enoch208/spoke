"use client";

import { Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModeBadge } from "@/components/ui/mode-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatMonBalance, type TokenLike } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { vaultCopy as copy } from "../copy/vault";
import { useIsDemo } from "../shared/hooks";

export function WalletCard({ token }: { token: TokenLike }) {
  const funding = useClientQuery("funding.status", {}, { refetchInterval: 20_000 });
  const demo = useIsDemo();
  const data = funding.data;
  return (
    <Card padding="lg" className="flex h-full flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="bg-pill text-ink flex size-9 items-center justify-center rounded-full">
          <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 className="font-display text-h4 text-ink font-medium">{copy.wallet}</h2>
        {demo ? <ModeBadge mode="demo" /> : null}
      </div>
      <dl className="space-y-4">
        <div>
          <dt className="text-subtle text-sm">{copy.walletSdusd}</dt>
          <dd className="text-ink mt-1 font-mono text-xl tabular-nums">
            {data ? (
              data.sdusd === null ? (
                "—"
              ) : (
                formatAmount(BigInt(data.sdusd), token)
              )
            ) : (
              <Skeleton className="h-7 w-36" />
            )}
          </dd>
        </div>
        <div>
          <dt className="text-subtle text-sm">{copy.walletMon}</dt>
          <dd className="text-ink mt-1 font-mono text-xl tabular-nums">
            {data ? formatMonBalance(BigInt(data.monWei)) : <Skeleton className="h-7 w-36" />}
          </dd>
        </div>
      </dl>
      <p className="text-subtle text-sm">{copy.walletNote}</p>
      <div className="mt-auto">
        <Button
          variant="secondary"
          block
          onClick={() => {
            useUiStore.getState().open("M-06", { context: "vault" });
          }}
        >
          {copy.getFunds}
        </Button>
      </div>
    </Card>
  );
}
