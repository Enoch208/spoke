"use client";

import { formatDateTime, formatRelative } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";
import { isAddress } from "viem";

export function InsightsPanel({ address }: { address: string | null }) {
  const valid = Boolean(address && isAddress(address));
  const insights = useClientQuery(
    "insights.forDistributor",
    { address: address ?? "0x0000000000000000000000000000000000000000" },
    { enabled: valid },
  );
  if (!valid) return null;
  const data = insights.data;
  return (
    <Card>
      <h2 className="font-display text-h4">Wallet context</h2>
      <p className="text-body mt-3 text-sm">
        Public history on supported mainnets, separate from Spoke’s settled testnet record. This
        context never changes rewards or ranking.
      </p>
      {data ? (
        <>
          <p className="text-subtle mt-3 text-sm">{data.scopeNote}</p>
          {data.status === "no_history" ? (
            <p className="mt-4">
              No public history was found on the supported networks for this address.
            </p>
          ) : data.status === "none" ? (
            <p className="mt-4">No cached insights are available for this address.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {data.labels.map((label) => (
                  <span className="bg-pill rounded-full px-3 py-1 text-sm" key={label}>
                    {label}
                  </span>
                ))}
              </div>
              {data.activitySummary ? (
                <p className="text-sm">
                  {data.activitySummary.transactions ?? "Unknown"} transactions · Last active{" "}
                  {data.activitySummary.lastActiveAt
                    ? formatDateTime(new Date(data.activitySummary.lastActiveAt))
                    : "not reported"}
                </p>
              ) : null}
              {data.reviewSignals.map((signal) => (
                <div className="bg-amber-soft rounded-xl p-3" key={signal.label}>
                  <p className="font-medium">{signal.label}</p>
                  <p className="text-body text-sm">{signal.reason}</p>
                </div>
              ))}
            </div>
          )}
          {data.fetchedAt ? (
            <p className="text-subtle mt-4 text-xs">
              {data.source ?? "Wallet data"} · Cached {formatRelative(new Date(data.fetchedAt))}.
              Page views do not request a refresh.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-subtle mt-3 text-sm">
          {insights.error?.message ?? "Loading cached context…"}
        </p>
      )}
    </Card>
  );
}
