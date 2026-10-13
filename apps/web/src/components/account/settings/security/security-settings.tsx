"use client";

import { QueryState } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { DevicesCard } from "./devices-card";
import { PasskeysCard } from "./passkeys-card";
import { QuickActionsCard } from "./quick-actions-card";
import { RecoveryCard } from "./recovery-card";

export function SecuritySettings() {
  const me = useClientQuery("account.me", {});
  return (
    <QueryState pending={me.isPending} error={me.error} retry={() => void me.refetch()}>
      {me.data ? (
        <div className="grid gap-5">
          <RecoveryCard me={me.data} />
          <PasskeysCard me={me.data} />
          <QuickActionsCard me={me.data} />
          <DevicesCard />
        </div>
      ) : null}
    </QueryState>
  );
}
