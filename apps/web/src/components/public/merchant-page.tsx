"use client";

import { GlobeIcon, Store01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isSupportedChainId, type ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton, ProductPage, QueryState } from "@/components/product/page";
import { Address } from "@/components/ui/address";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useClientContext } from "@/lib/client/provider";
import { fill, globalStates } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";
import { disclosureCopy } from "./copy/disclosures";
import { merchantCopy } from "./copy/merchant";
import { reportCopy } from "./copy/report";
import { ChecksPanel } from "./merchant/checks-panel";
import { OfferTabs, useMerchantOffers } from "./merchant/offer-tabs";
import { RecordSection } from "./merchant/record-section";
import { Callout } from "./shared/callout";
import { formatMonthYear } from "./shared/dates";
import { DemoLinkInLive, LiveLinkInDemo, useIdentifierMatch } from "./shared/demo-link";
import { Disclosures } from "./shared/disclosures";
import { ReportButton } from "./shared/report-button";
import { usePublicViewer } from "./shared/viewer";

type Merchant = ClientOutput<"merchants.get">;

function Identity({ merchant, demo }: { merchant: Merchant; demo: boolean }) {
  const chainId = isSupportedChainId(activeChain.id) ? activeChain.id : null;
  return (
    <Card padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {merchant.logo ? (
        <img
          src={merchant.logo}
          alt=""
          className="border-hairline size-16 shrink-0 rounded-2xl border object-cover"
        />
      ) : (
        <Avatar seed={merchant.slug} name={merchant.name} size="lg" className="size-16" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start gap-2">
          {merchant.description ? (
            <p className="text-body min-w-0 flex-1">{merchant.description}</p>
          ) : null}
          {demo ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
        </div>
        <div className="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>{fill(merchantCopy.since, { date: formatMonthYear(merchant.joinedAt) })}</span>
          {merchant.website ? (
            <a
              href={merchant.website}
              target="_blank"
              rel="nofollow ugc noopener"
              className="text-ink inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <HugeiconsIcon icon={GlobeIcon} size={14} strokeWidth={1.8} aria-hidden="true" />
              {new URL(merchant.website).host}
            </a>
          ) : null}
          {chainId ? (
            <Address
              address={merchant.address}
              chainId={chainId}
              showAddress
              demo={demo}
              explorer={!demo}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function MerchantBody({ merchant }: { merchant: Merchant }) {
  const { mode } = useClientContext();
  const { me } = usePublicViewer();
  const offers = useMerchantOffers(merchant.slug);
  const owner = me?.workspaces.some((workspace) => workspace.slug === merchant.slug) ?? false;
  const demo = mode === "demo";
  return (
    <ProductPage
      title={merchant.name}
      breadcrumbs={[{ label: merchantCopy.crumb, href: routes.explore }]}
    >
      {owner ? (
        <Callout
          tone="info"
          actions={
            <Button asChild size="sm" variant="secondary">
              <Link href={routes.sell.settings}>{merchantCopy.edit}</Link>
            </Button>
          }
        >
          {merchantCopy.ownerBar}
        </Callout>
      ) : null}
      <Identity merchant={merchant} demo={demo} />
      <ChecksPanel merchant={merchant} demo={demo} />
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-h4 text-ink font-medium">{merchantCopy.offers}</h2>
        <OfferTabs offers={offers} name={merchant.name} />
      </section>
      <RecordSection slug={merchant.slug} tokens={offers.tokens} />
      <Disclosures lines={[disclosureCopy.testnet]} />
      {owner ? null : (
        <div className="border-hairline flex justify-end border-t pt-4">
          <ReportButton
            label={reportCopy.merchant}
            target={{ kind: "merchant", id: merchant.id, name: merchant.name }}
          />
        </div>
      )}
    </ProductPage>
  );
}

function NotFound() {
  return (
    <EmptyState
      variant="page"
      icon={Store01Icon}
      title={merchantCopy.notFoundTitle}
      body={merchantCopy.notFoundBody}
      actions={
        <Button asChild>
          <Link href={routes.explore}>{merchantCopy.explore}</Link>
        </Button>
      }
    />
  );
}

function MerchantLoader({ slug }: { slug: string }) {
  const merchant = useClientQuery("merchants.get", { slug });
  const code = merchant.error?.code;
  if (code === "NOT_FOUND" || code === "VALIDATION_FAILED") return <NotFound />;
  return (
    <QueryState
      pending={merchant.isPending}
      error={merchant.error}
      retry={() => void merchant.refetch()}
    >
      {merchant.data ? <MerchantBody merchant={merchant.data} /> : null}
    </QueryState>
  );
}

function MerchantRoute({ slug }: { slug: string }) {
  const match = useIdentifierMatch(slug);
  if (match === "pending") return <PageSkeleton />;
  if (match === "demoInLive") return <DemoLinkInLive />;
  if (match === "liveInDemo")
    return <LiveLinkInDemo title={merchantCopy.notFoundTitle} body={merchantCopy.notFoundBody} />;
  return <MerchantLoader slug={slug} />;
}

export function MerchantPage({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MerchantRoute slug={slug} />
    </Suspense>
  );
}
