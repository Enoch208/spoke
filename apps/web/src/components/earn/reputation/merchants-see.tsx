"use client";

import type { ClientOutput } from "@spoke/protocol";
import { Badge } from "@/components/ui/badge";
import { useClientContext } from "@/lib/client/provider";
import { formatCount, formatHandle } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { reputationCopy as copy } from "../copy/reputation";
import { useRecordCategories } from "../opportunities/record-categories";
import { Section } from "../shared/section";
import { VisibilityChip } from "../shared/visibility-chip";

export function MerchantsSee({
  profile,
  address,
}: {
  profile: ClientOutput<"reputation.mine">;
  address: string | null;
}) {
  const { mode } = useClientContext();
  const record = useRecordCategories();
  const insights = useClientQuery(
    "insights.forDistributor",
    { address: address ?? "" },
    { enabled: address !== null },
  );
  const available = insights.data?.status === "available" ? insights.data : null;
  const handle = profile.handle;
  return (
    <Section title={copy.merchantsSee.title}>
      <div className="grid gap-4">
        <div className="border-line grid gap-3 rounded-2xl border border-dashed p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-ink font-medium">
              {handle ? formatHandle(handle) : copy.header.noHandle}
            </p>
            <VisibilityChip level={profile.visibility} />
          </div>
          {profile.visibility === "private" ? (
            <p className="text-subtle text-sm">{copy.privateBanner}</p>
          ) : (
            <>
              <p className="text-body text-sm">
                {formatCount(profile.settledConversions)} {copy.tiles.settled.toLowerCase()} ·{" "}
                {formatCount(profile.merchantCount)} {copy.tiles.merchants.toLowerCase()}
              </p>
              {record.names.length > 0 ? (
                <p className="text-subtle text-sm">{record.names.join(" · ")}</p>
              ) : null}
              {profile.visibility === "pseudonymous" ? (
                <p className="text-subtle text-sm">{copy.pseudonymousLine}</p>
              ) : null}
            </>
          )}
        </div>
        {available ? (
          <div className="bg-soft grid gap-2 rounded-2xl p-4 text-sm">
            <p className="text-ink flex flex-wrap items-center gap-2 font-medium">
              {mode === "demo" ? (
                <Badge>{copy.merchantsSee.sample}</Badge>
              ) : (
                copy.merchantsSee.insights
              )}
            </p>
            <p className="text-body">{available.labels.join(" · ")}</p>
            <p className="text-subtle">{available.scopeNote}</p>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
