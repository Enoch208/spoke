"use client";

import { Add01Icon, Link01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { ProductPage, QueryState } from "@/components/product/page";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { linksPageCopy as copy } from "../copy/links-page";
import { useMyLinks } from "../shared/campaigns";
import { linkStateCopy } from "@/lib/copy";
import { linkStatus, type LinkStatus } from "../shared/link-status";
import { useManyQueries } from "../shared/use-many";
import { PendingLinks } from "./pending-links";
import { LinksTable, VisitsInfo } from "./links-table";
import { applyFilters, sorts, type LinkSort } from "./link-filters";

const pageSize = 25;
const statuses: readonly LinkStatus[] = ["active", "paused", "exhausted", "closed", "hidden"];

export function LinksPage() {
  const now = useNow();
  const links = useMyLinks();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LinkStatus | "all">("all");
  const [merchant, setMerchant] = useState("all");
  const [sort, setSort] = useState<LinkSort>("recent");
  const [page, setPage] = useState(1);
  const stats = useManyQueries(
    "links.stats",
    links.items.map((link) => ({ nodeId: link.nodeId })),
  );
  const statsOf = (nodeId: string) =>
    stats[links.items.findIndex((link) => link.nodeId === nodeId)];
  const merchants = [...new Set(links.items.map((link) => link.campaign.merchant.name))].sort();
  const filtered = applyFilters(links.items, { q, status, merchant, sort, stats: statsOf });
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  const filtering = q !== "" || status !== "all" || merchant !== "all";
  const sum = (pick: (index: number) => number) =>
    links.items.reduce((total, _link, index) => total + pick(index), 0);
  const summary = [
    { key: "links", label: copy.summary.links, value: links.items.length },
    {
      key: "active",
      label: copy.summary.active,
      value: links.items.filter((link) => linkStatus(link) === "active").length,
    },
    {
      key: "under",
      label: copy.summary.under,
      value: sum((index) => stats[index]?.descendants ?? 0),
    },
    {
      key: "visits",
      label: copy.summary.visits,
      value: sum((index) => links.items[index]?.visitsEstimate ?? 0),
    },
    {
      key: "sales",
      label: copy.summary.sales,
      value: sum((index) => {
        const row = stats[index];
        return row ? row.sales.pending + row.sales.finalized : 0;
      }),
    },
  ];
  const reset = () => {
    setQ("");
    setStatus("all");
    setMerchant("all");
    setPage(1);
  };
  return (
    <ProductPage
      title={copy.title}
      description={copy.description}
      actions={
        <Button asChild>
          <Link href={routes.earn.opportunities}>
            <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={2} aria-hidden="true" />
            {copy.newLink}
          </Link>
        </Button>
      }
    >
      <QueryState
        pending={links.query.isPending}
        error={links.query.error}
        retry={() => void links.query.refetch()}
        loading="rows"
      >
        <PendingLinks now={now} />
        {links.items.length === 0 ? (
          <EmptyState
            variant="page"
            icon={Link01Icon}
            title={copy.empty.title}
            body={copy.empty.body}
            actions={
              <Button asChild>
                <Link href={routes.earn.opportunities}>{copy.empty.action}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <dl
              aria-label={copy.summary.label}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 max-sm:[&>*:last-child]:col-span-2"
            >
              {summary.map((item) => (
                <div
                  key={item.key}
                  className="bg-surface border-hairline grid gap-1 rounded-2xl border p-4"
                >
                  <dt className="text-subtle text-sm">
                    {item.label} {item.key === "visits" ? <VisitsInfo /> : null}
                  </dt>
                  <dd className="text-ink font-mono text-xl tabular-nums">
                    {formatCount(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <label className="relative col-span-2 min-w-0 flex-1 basis-60">
                <span className="sr-only">{copy.filters.search}</span>
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={18}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="text-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  value={q}
                  placeholder={copy.filters.search}
                  className="pl-10"
                  onChange={(event) => {
                    setQ(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <div className="min-w-0 sm:w-44">
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: copy.filters.allStatuses },
                    ...statuses.map((key) => ({ value: key, label: linkStateCopy[key].label })),
                  ]}
                />
              </div>
              <div className="min-w-0 sm:w-52">
                <Select
                  value={merchant}
                  onValueChange={(value) => {
                    setMerchant(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: copy.filters.allMerchants },
                    ...merchants.map((name) => ({ value: name, label: name })),
                  ]}
                />
              </div>
              <div className="col-span-2 min-w-0 sm:w-48">
                <Select
                  value={sort}
                  onValueChange={setSort}
                  options={sorts.map((key) => ({ value: key, label: copy.filters[key] }))}
                />
              </div>
            </div>
            {filtered.length === 0 && filtering ? (
              <EmptyState
                variant="compact"
                title={copy.filtered}
                actions={
                  <Button size="sm" variant="secondary" onClick={reset}>
                    {copy.filters.clear}
                  </Button>
                }
              />
            ) : (
              <LinksTable links={shown} stats={statsOf} />
            )}
            {filtered.length > pageSize ? (
              <Pagination
                label={copy.pages}
                page={page}
                hasPrevious={page > 1}
                hasNext={page * pageSize < filtered.length}
                onPrevious={() => {
                  setPage(page - 1);
                }}
                onNext={() => {
                  setPage(page + 1);
                }}
              />
            ) : null}
            <p className="text-subtle text-sm">{copy.disclosure}</p>
          </>
        )}
      </QueryState>
    </ProductPage>
  );
}
