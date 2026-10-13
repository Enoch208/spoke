"use client";

import Link from "next/link";
import { LoadingSkeleton } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { homeCopy } from "../copy/home";
import { useMyLinks } from "../shared/campaigns";
import { ConversionRow } from "../shared/conversion-row";
import { Section } from "../shared/section";

const copy = homeCopy.sales;

export function RecentSales() {
  const now = useNow();
  const links = useMyLinks();
  const sales = useClientQuery("earnings.byConversion", { limit: 5 });
  const rows = sales.data?.items ?? [];
  return (
    <Section
      title={copy.title}
      padding="none"
      actions={
        <Link href={routes.earn.earnings} className="text-ink text-sm underline underline-offset-2">
          {copy.all}
        </Link>
      }
    >
      {sales.isPending ? <LoadingSkeleton shape="rows" /> : null}
      {sales.data && rows.length === 0 ? (
        <p className="text-subtle px-5 pb-5 text-sm">{copy.empty}</p>
      ) : null}
      <ul className="divide-hairline divide-y px-2 pb-2">
        {rows.map((row) => (
          <ConversionRow
            key={`${row.saleId}-${String(row.level)}`}
            row={row}
            campaign={links.campaignOf(row.campaignId)}
            now={now}
          />
        ))}
      </ul>
    </Section>
  );
}
