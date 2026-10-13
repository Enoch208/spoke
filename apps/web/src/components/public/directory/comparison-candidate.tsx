"use client";

import { useState } from "react";
import Link from "next/link";
import { InsightsPanel } from "@/components/platform/insights-panel";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref, routeTo } from "@/lib/routes";
import { profileName } from "../profile/types";
import { ComparisonMetrics } from "./comparison-metrics";

export function ComparisonCandidate({
  id,
  sample,
  remove,
}: {
  id: string;
  sample: boolean;
  remove: () => void;
}) {
  const query = useClientQuery(
    "reputation.get",
    { addressOrHandle: id },
    { staleTime: 0, refetchInterval: 30_000 },
  );
  const [contextOpen, setContextOpen] = useState(false);
  const profile = query.data && !("hidden" in query.data) ? query.data : null;
  const name = profile ? (profileName(profile) ?? id) : id;
  const available = profile !== null && query.error === null;
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar seed={id} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-h4 break-words">{name}</h3>
          {available ? (
            <p className="text-subtle mt-1 text-sm">{profile.visibility} profile</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {sample ? <Badge>Sample</Badge> : <Badge>Spoke · Testnet record</Badge>}
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Remove ${name} from comparison`}
          onClick={remove}
        >
          Remove
        </Button>
      </div>
      {query.isPending ? (
        <p role="status" className="text-subtle text-sm">
          Loading the latest shared record…
        </p>
      ) : query.error ? (
        <div role="alert" className="space-y-3 text-sm">
          <p>
            This record could not be loaded. Previously shown values are hidden until it refreshes.
          </p>
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : !profile ? (
        <p className="text-subtle text-sm">
          This profile is private or no longer available. Remove it to choose another distributor.
        </p>
      ) : (
        <>
          <ComparisonMetrics profile={profile} />
          <p className="text-subtle text-xs">
            Only finalized, non-refunded sales count. One sale can credit several contributors;
            these columns must not be added together.
          </p>
          <div className="border-hairline space-y-2 border-t pt-4">
            <h4 className="text-sm font-medium">Settlement evidence</h4>
            {profile.evidence.items.length ? (
              <ul className="flex flex-wrap gap-3 text-sm">
                {profile.evidence.items.slice(0, 3).map((receipt) => (
                  <li key={`${String(receipt.chainId)}:${receipt.saleId}`}>
                    <Link
                      className="underline underline-offset-2"
                      href={receiptHref(receipt.saleId, receipt.chainId)}
                    >
                      Receipt #{receipt.saleId}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-subtle text-sm">
                Individual receipts are not shared in this profile.
              </p>
            )}
            {profile.lastIndexedBlock ? (
              <p className="text-subtle text-xs">
                Indexed through block {formatCount(BigInt(profile.lastIndexedBlock))}
              </p>
            ) : null}
          </div>
          {profile.subject && profile.visibility === "public" ? (
            <div className="border-hairline border-t pt-4">
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={contextOpen}
                aria-controls={`wallet-context-${id}`}
                onClick={() => {
                  setContextOpen((value) => !value);
                }}
              >
                {contextOpen ? "Hide wallet context" : "Review wallet context"}
              </Button>
              {contextOpen ? (
                <div id={`wallet-context-${id}`} className="mt-3">
                  <InsightsPanel address={profile.subject} />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-subtle text-sm">
              Wallet context is unavailable for a pseudonymous profile.
            </p>
          )}
          <Button asChild variant="secondary" size="sm" className="mt-auto">
            <Link href={`${routeTo.profile(profile.handle ?? profile.subject ?? id)}#receipts`}>
              View full profile & receipts
            </Link>
          </Button>
        </>
      )}
    </Card>
  );
}
