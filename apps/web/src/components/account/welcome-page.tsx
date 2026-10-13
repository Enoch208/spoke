"use client";

import { QueryState } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { WelcomeFlow } from "./welcome/welcome-flow";

export function WelcomePage() {
  const me = useClientQuery("account.me", {});
  return (
    <QueryState pending={me.isPending} error={me.error} retry={() => void me.refetch()}>
      {me.data ? <WelcomeFlow key={me.data.address} me={me.data} /> : null}
    </QueryState>
  );
}
