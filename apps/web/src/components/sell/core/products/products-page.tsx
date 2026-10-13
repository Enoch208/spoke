"use client";

import { Package01Icon, PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TabList, Tabs } from "@/components/ui/tabs";
import { useClientQuery } from "@/lib/query/use-client";
import { productsCopy as copy } from "../copy/products";
import { pick, useQueryParams } from "../shared/use-query-params";
import { useProductUsage } from "./product-chip";
import { ProductRows } from "./product-rows";
import { isReady } from "./product-status";

const tabs = ["all", "ready", "drafts"] as const;

const newProduct = (
  <Button asChild>
    <Link href="/sell/products/new">
      <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={1.8} aria-hidden="true" />
      {copy.newProduct}
    </Link>
  </Button>
);

export function ProductsPage() {
  const params = useQueryParams();
  const products = useClientQuery("products.list", { limit: 100 });
  const categories = useClientQuery("products.categories", {});
  const me = useClientQuery("merchants.me", {});
  const usage = useProductUsage(me.data?.slug);
  const tab = pick(params.get("status"), tabs, "all");
  const category = params.get("category") ?? "all";
  const [q, setQ] = useState(params.get("q") ?? "");
  const all = products.data?.items ?? [];
  const inTab = (value: (typeof tabs)[number]) =>
    all.filter((item) =>
      value === "all" ? true : value === "ready" ? isReady(item) : !isReady(item),
    );
  const visible = inTab(tab).filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!q.trim() || item.title.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const categoryName = (id: string) => categories.data?.find((item) => item.id === id)?.name ?? id;
  return (
    <ProductPage title={copy.title} description={copy.description} actions={newProduct}>
      <QueryState
        pending={products.isPending}
        error={products.error}
        retry={() => void products.refetch()}
        loading="rows"
      >
        {all.length === 0 ? (
          <Card>
            <EmptyState
              icon={Package01Icon}
              title={copy.emptyTitle}
              body={copy.emptyBody}
              actions={newProduct}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            <Tabs
              value={tab}
              values={tabs}
              onValueChange={(value) => {
                params.set({ status: value === "all" ? null : value });
              }}
            >
              <TabList
                label={copy.tabsLabel}
                value={tab}
                items={tabs.map((value) => ({
                  value,
                  label: copy.tabs[value],
                  count: inTab(value).length,
                }))}
              />
            </Tabs>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                aria-label={copy.search}
                value={q}
                placeholder={copy.search}
                prefix={
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={16}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                }
                onChange={(event) => {
                  setQ(event.target.value);
                }}
                onBlur={() => {
                  params.set({ q: q.trim() || null });
                }}
              />
              <Select
                value={category}
                onValueChange={(value) => {
                  params.set({ category: value === "all" ? null : value });
                }}
                className="sm:w-56"
                options={[
                  { value: "all", label: copy.allCategories },
                  ...(categories.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </div>
            <Card padding="none" className="overflow-hidden">
              {visible.length === 0 ? (
                <EmptyState
                  variant="compact"
                  title={copy.filteredEmpty}
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setQ("");
                        params.set({ status: null, category: null, q: null });
                      }}
                    >
                      {copy.clear}
                    </Button>
                  }
                />
              ) : (
                <ProductRows products={visible} usage={usage} categoryName={categoryName} />
              )}
            </Card>
          </div>
        )}
      </QueryState>
    </ProductPage>
  );
}
