"use client";

import Link from "next/link";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { homeCopy } from "../copy/home";
import { useRecordCategories } from "../opportunities/record-categories";
import { Section } from "../shared/section";
import { VisibilityChip } from "../shared/visibility-chip";

const copy = homeCopy.record;

export function RecordCard() {
  const reputation = useClientQuery("reputation.mine", {});
  const record = useRecordCategories();
  const data = reputation.data;
  return (
    <Section
      title={copy.title}
      actions={data ? <VisibilityChip level={data.visibility} /> : undefined}
    >
      {data ? (
        <div className="grid gap-4">
          <dl className="grid grid-cols-2 gap-3">
            <div className="bg-soft grid gap-1 rounded-xl p-3">
              <dt className="text-subtle text-sm">{copy.settled}</dt>
              <dd className="text-ink font-mono text-xl tabular-nums">
                {formatCount(data.settledConversions)}
              </dd>
            </div>
            <div className="bg-soft grid gap-1 rounded-xl p-3">
              <dt className="text-subtle text-sm">{copy.merchants}</dt>
              <dd className="text-ink font-mono text-xl tabular-nums">
                {formatCount(data.merchantCount)}
              </dd>
            </div>
          </dl>
          <div className="grid gap-1 text-sm">
            <span className="text-subtle">{copy.categories}</span>
            <span className="text-ink">
              {record.names.length > 0 ? record.names.join(" · ") : copy.none}
            </span>
          </div>
          <Link
            href={routes.earn.reputation}
            className="text-ink text-sm underline underline-offset-2"
          >
            {copy.open}
          </Link>
        </div>
      ) : null}
    </Section>
  );
}
