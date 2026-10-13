"use client";

import Link from "next/link";
import { ProductPage, PageSkeleton } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { fill } from "@/lib/copy";
import { campaignTabs, routeTo } from "@/lib/routes";
import { campaignCopy as copy } from "../copy/campaign";
import { vaultCopy } from "../copy/vault";
import { useCampaignMoney, useCampaignNames, useOwnsCampaign } from "../shared/hooks";
import { pick, useQueryParams } from "../shared/use-query-params";
import { SalesTable } from "../sales/sales-table";
import { BudgetTab } from "./budget-tab";
import { CampaignHeaderActions, CampaignSubhead, StateBanner } from "./campaign-header";
import { DistributorsTab } from "./distributors-tab";
import { NetworkTab } from "./network-tab";
import { OverviewTab } from "./overview-tab";
import { PolicyTab } from "./policy-tab";
import { SettingsTab } from "./settings-tab";

function Missing({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <Card>
      <EmptyState
        title={title}
        actions={
          <Button asChild variant="secondary">
            <Link href={href}>{label}</Link>
          </Button>
        }
      />
    </Card>
  );
}

export function MerchantCampaignPage({ campaignId }: { campaignId: string }) {
  const params = useQueryParams();
  const money = useCampaignMoney(campaignId);
  const mine = money.campaign;
  const owns = useOwnsCampaign(mine.data?.merchant.slug);
  const { mine: list } = useCampaignNames();
  const tab = pick(params.get("tab"), campaignTabs, "overview");
  const data = mine.data;
  const crumbs = [{ label: copy.breadcrumb, href: "/sell/campaigns" }];
  if (mine.isPending || (data && owns === null)) return <PageSkeleton />;
  if (!data || mine.error)
    return (
      <ProductPage title={copy.breadcrumb} breadcrumbs={crumbs}>
        {mine.error.code !== "NOT_FOUND" ? (
          <ErrorState
            title="We couldn’t load this campaign."
            body="Check your connection and try again."
            actions={
              <Button variant="secondary" onClick={() => void mine.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <Missing
            title={fill(copy.notFound, { id: campaignId })}
            href="/sell/campaigns"
            label={copy.back}
          />
        )}
      </ProductPage>
    );
  if (!owns)
    return (
      <ProductPage title={data.product.title} breadcrumbs={crumbs}>
        <Missing
          title={copy.notYours}
          href={routeTo.campaign(campaignId)}
          label={copy.publicPage}
        />
      </ProductPage>
    );
  const stateKey = money.stateKey ?? "live";
  const available = money.buckets?.available ?? BigInt(data.rewardAvailable);
  const alertSales =
    list.data?.items.find((row) => row.campaignId === campaignId)?.budgetAlertSales ?? null;
  return (
    <ProductPage
      title={data.product.title}
      breadcrumbs={crumbs}
      actions={
        <CampaignHeaderActions campaignId={campaignId} stateKey={stateKey} available={available} />
      }
    >
      <CampaignSubhead data={data} />
      <StateBanner stateKey={stateKey} campaignId={campaignId} available={available} />
      <Tabs
        value={tab}
        values={campaignTabs}
        onValueChange={(value) => {
          params.set({
            tab: value === "overview" ? null : value,
            state: null,
            q: null,
            period: null,
          });
        }}
      >
        <TabList
          label={copy.tabsLabel}
          value={tab}
          items={campaignTabs.map((value) => ({ value, label: copy.tabs[value] }))}
          className="border-hairline border-b pb-2"
        />
        <TabPanel value="overview">
          <OverviewTab
            data={data}
            buckets={money.buckets}
            reward={money.reward ?? 0n}
            liabilityCap={BigInt(data.policy.campaignLiabilityCap)}
          />
        </TabPanel>
        <TabPanel value="network">
          <NetworkTab campaignId={campaignId} />
        </TabPanel>
        <TabPanel value="sales">
          <SalesTable campaignId={campaignId} />
        </TabPanel>
        <TabPanel value="budget">
          {money.entry ? (
            <BudgetTab
              entry={money.entry}
              token={data.token}
              stateKey={stateKey}
              name={data.product.title}
              alertSales={alertSales}
              indexedBlock={money.vault.data?.lastIndexedBlock}
            />
          ) : money.vault.isPending ? (
            <PageSkeleton />
          ) : (
            <Card>
              <EmptyState title={vaultCopy.emptyTitle} body={copy.banners.notFunded} />
            </Card>
          )}
        </TabPanel>
        <TabPanel value="distributors">
          <DistributorsTab campaignId={campaignId} token={data.token} />
        </TabPanel>
        <TabPanel value="policy">
          <PolicyTab data={data} stateKey={stateKey} />
        </TabPanel>
        <TabPanel value="settings">
          <SettingsTab
            campaignId={campaignId}
            stateKey={stateKey}
            available={available}
            token={data.token}
            alertSales={alertSales}
          />
        </TabPanel>
      </Tabs>
    </ProductPage>
  );
}
