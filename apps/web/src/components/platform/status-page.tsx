"use client";

import { formatDateTime, formatRelative } from "@/lib/format";
import { ProductPage, QueryState, Stat } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";

export function StatusPage() {
  const health = useClientQuery("system.health", {}, { live: true, refetchInterval: 15_000 });
  const status = useClientQuery("system.status", {}, { live: true, refetchInterval: 15_000 });
  return (
    <ProductPage
      title="Spoke status"
      description="Live testnet service health. Lists come from the activity index; money is settled by the contract."
    >
      <QueryState
        pending={status.isPending}
        error={status.error}
        retry={() => void status.refetch()}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="API" value={health.data?.api ?? "—"} />
          <Stat label="RPC" value={health.data?.rpc ?? "—"} />
          <Stat label="Activity index" value={status.data?.indexer.state ?? "—"} />
        </div>
        <Card>
          <h2 className="font-display text-h4">Index progress</h2>
          <p className="text-body mt-3">
            {status.data?.indexer.name ?? "Indexer not configured"} · Indexed block{" "}
            {status.data?.indexer.indexedBlock ?? "unavailable"} · Chain head{" "}
            {status.data?.indexer.chainHead ?? "unavailable"}
          </p>
          <p className="text-subtle mt-2 text-sm">
            Lag: {status.data?.indexer.lagBlocks ?? "unknown"} blocks. Chain time{" "}
            {status.data?.indexer.chainTime
              ? formatDateTime(new Date(status.data.indexer.chainTime))
              : "unavailable"}
            .
          </p>
        </Card>
        {status.data?.incidents.length === 0 ? (
          <Card>
            <p>No active incidents have been published.</p>
          </Card>
        ) : (
          status.data?.incidents.map((incident) => (
            <Card key={incident.id}>
              <h2 className="font-display text-h4">{incident.title}</h2>
              <p className="text-body mt-3">{incident.impact}</p>
              <p className="text-subtle mt-3 text-sm">
                {incident.severity} · Updated {formatRelative(new Date(incident.updatedAt))}
              </p>
            </Card>
          ))
        )}
      </QueryState>
    </ProductPage>
  );
}
