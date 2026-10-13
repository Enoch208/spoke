"use client";

import { Download01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { ProductPage, QueryState } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { usePhone } from "@/components/ui/use-phone";
import { earningsCopy } from "../copy/earnings";
import { earnFootnotes } from "../copy/money";
import { EarningsTiles } from "../shared/earnings-tiles";
import { TestnetFootnote } from "../shared/footnote";
import { oneOf, useQueryState } from "../shared/query";
import { sameAddress } from "../shared/viewer";
import { ByCampaign } from "./by-campaign";
import { BySale } from "./by-sale";
import { HowEarningsMove } from "./how-earnings-move";
import { NotEarned } from "./not-earned";

const tabs = ["conversions", "campaigns", "missed"] as const;

export function EarningsPage() {
  const query = useQueryState();
  const phone = usePhone();
  const open = useUiStore((state) => state.open);
  const summary = useClientQuery("earnings.summary", {}, { refetchInterval: 10_000 });
  const claimable = useClientQuery("earnings.claimable", {}, { refetchInterval: 10_000 });
  const campaigns = useClientQuery("earnings.byCampaign", {});
  const missed = useClientQuery("earnings.missed", { limit: 100 });
  const tab = oneOf(query.get("tab"), tabs, "conversions");
  const tokens = summary.data?.tokens ?? [];
  const tokenAddress = query.get("token") ?? tokens[0]?.token.address;
  const row = tokens.find((item) => sameAddress(item.token.address, tokenAddress)) ?? tokens[0];
  const chainAmount = claimable.data?.tokens.find((item) =>
    sameAddress(item.token.address, row?.token.address),
  )?.amount;
  const tokenCampaigns = (campaigns.data ?? []).filter((item) =>
    sameAddress(item.token.address, row?.token.address),
  );
  return (
    <ProductPage
      title={earningsCopy.title}
      description={earningsCopy.description}
      actions={
        <>
          {tokens.length > 1 && row ? (
            <div className="w-36">
              <Select
                value={row.token.address}
                onValueChange={(value) => {
                  query.set({ token: value });
                }}
                options={tokens.map((item) => ({
                  value: item.token.address,
                  label: item.token.symbol,
                }))}
              />
            </div>
          ) : null}
          <Button
            variant="secondary"
            icon={Download01Icon}
            onClick={() => open("M-35", { scope: "distributor", kind: "distributorEarnings" })}
          >
            {earningsCopy.export}
          </Button>
        </>
      }
    >
      <QueryState
        pending={summary.isPending}
        error={summary.error}
        retry={() => void summary.refetch()}
      >
        {row ? (
          <EarningsTiles
            row={row}
            claimableAmount={chainAmount}
            nextUnlockAt={summary.data?.nextUnlockAt ?? null}
          />
        ) : null}
        <HowEarningsMove defaultOpen={!phone} />
        <Tabs
          value={tab}
          values={tabs}
          onValueChange={(next) => {
            query.set({ tab: next });
          }}
        >
          <TabList
            value={tab}
            label={earningsCopy.tabsLabel}
            items={[
              { value: "conversions", label: earningsCopy.tabs.conversions },
              { value: "campaigns", label: earningsCopy.tabs.campaigns },
              {
                value: "missed",
                label: earningsCopy.tabs.missed,
                ...(missed.data ? { count: String(missed.data.items.length) } : {}),
              },
            ]}
          />
          <TabPanel value="conversions">
            <BySale campaigns={campaigns.data ?? []} />
          </TabPanel>
          <TabPanel value="campaigns">
            {row ? <ByCampaign rows={tokenCampaigns} token={row.token} /> : null}
          </TabPanel>
          <TabPanel value="missed">
            <NotEarned
              rows={missed.data?.items ?? []}
              pending={missed.isPending}
              error={missed.error}
              retry={() => void missed.refetch()}
            />
          </TabPanel>
        </Tabs>
        <TestnetFootnote extra={earnFootnotes.amounts} />
      </QueryState>
    </ProductPage>
  );
}
