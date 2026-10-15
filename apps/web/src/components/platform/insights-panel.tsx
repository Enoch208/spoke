"use client";

import { formatDateTime, formatRelative } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResearchEvidence } from "./research-evidence";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { isAddress } from "viem";

export function InsightsPanel({ address }: { address: string | null }) {
  const valid = Boolean(address && isAddress(address));
  const insights = useClientQuery(
    "insights.forDistributor",
    { address: address ?? "0x0000000000000000000000000000000000000000" },
    { enabled: valid, staleTime: 0, refetchInterval: 30_000 },
  );
  const research = useClientMutation("insights.research", ["insights.forDistributor"]);
  const messages = {
    refreshed:
      "Research updated. Review the source coverage below before making a partnership decision.",
    cached: "This research is less than 24 hours old. The saved result was reused.",
    already_attempted:
      "A lookup was already attempted today. Check again tomorrow; uncertain requests are not repeated automatically.",
    budget_exhausted:
      "Research is at its credit or daily request limit. Saved results and Spoke receipts remain available.",
    not_configured: "Live research is not available in this environment.",
    failed: "The provider could not complete this lookup. Existing research is unchanged.",
  };
  if (!valid) return null;
  const data = insights.error ? undefined : insights.data;
  return (
    <Card>
      <h2 className="font-display text-h4">Partner Intelligence</h2>
      <p className="text-body mt-3 text-sm">
        Public history on supported mainnets, separate from Spoke’s settled testnet record. This
        context never changes rewards or ranking.
      </p>
      <div className="mt-4 space-y-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={research.isPending || Boolean(insights.error)}
          onClick={() => {
            research.mutate({ address: address ?? "" });
          }}
        >
          {research.isPending ? "Researching wallet…" : "Refresh research"}
        </Button>
        <p className="text-subtle text-xs">
          Uses up to 3 existing Nansen credits when the cache is older than 24 hours. Limited to two
          fresh lookups per merchant per day. No automatic purchases or refreshes.
        </p>
        {research.error ? (
          <p role="alert" className="text-sm">
            {research.error.message}
          </p>
        ) : research.data ? (
          <p role="status" className="text-sm">
            {messages[research.data.status]}
          </p>
        ) : null}
      </div>
      {data ? (
        <>
          <p className="text-subtle mt-3 text-sm">{data.scopeNote}</p>
          {data.status === "no_history" ? (
            <p className="mt-4">
              No transactions were returned in the requested activity window. Missing history is not
              a judgment about this partner.
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
              {data.networks.length ? (
                <p className="text-subtle text-sm">
                  Networks in this result: {data.networks.join(", ")}
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
          {data.research ? <ResearchEvidence research={data.research} /> : null}
          {data.fetchedAt ? (
            <p className="text-subtle mt-4 text-xs">
              {data.source ?? "Wallet data"} · Cached {formatRelative(new Date(data.fetchedAt))}.
              Page views do not request a refresh.
            </p>
          ) : null}
        </>
      ) : (
        <p role={insights.error ? "alert" : "status"} className="text-subtle mt-3 text-sm">
          {insights.error?.message ?? "Loading cached context…"}
        </p>
      )}
    </Card>
  );
}
