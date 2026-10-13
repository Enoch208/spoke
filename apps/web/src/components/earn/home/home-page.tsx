"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductPage, QueryState } from "@/components/product/page";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { isBannerDismissed, useUiStore } from "@/lib/stores/ui";
import { browserSessionStart } from "@/lib/stores/storage";
import { useNow } from "@/lib/use-now";
import { homeCopy as copy } from "../copy/home";
import { useMyLinks } from "../shared/campaigns";
import { EarningsTiles } from "../shared/earnings-tiles";
import { TestnetFootnote } from "../shared/footnote";
import { ActiveLinks } from "./active-links";
import { Checklist } from "./checklist";
import { ClaimCard } from "./claim-card";
import { OpportunitiesCard } from "./opportunities-card";
import { RecentSales } from "./recent-sales";
import { RecordCard } from "./record-card";

const finishKey = "earn-finish-setup";

function FinishSetup() {
  const now = useNow();
  const me = useClientQuery("account.me", {});
  const dismissal = useUiStore((state) => state.dismissedBanners[finishKey]);
  const dismiss = useUiStore((state) => state.dismissBanner);
  const data = me.data;
  if (!data || data.onboarding.completedAt !== null) return null;
  if (isBannerDismissed(dismissal, now, browserSessionStart())) return null;
  const left = [
    data.onboarding.intent === null,
    data.handle === null,
    data.accountKind === "passkey" && data.recovery.checkedAt === null,
  ].filter(Boolean).length;
  if (left === 0) return null;
  return (
    <section className="bg-sky-soft flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
      <p className="text-ink font-medium">
        {left === 1 ? copy.finish.one : fill(copy.finish.title, { n: String(left) })}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            dismiss(finishKey, { forMs: 31_536_000_000 });
          }}
        >
          {copy.finish.dismiss}
        </Button>
        <Button asChild size="sm">
          <Link href={routes.welcome}>{copy.finish.continue}</Link>
        </Button>
      </div>
    </section>
  );
}

export function EarnHomePage() {
  const links = useMyLinks();
  const summary = useClientQuery("earnings.summary", {}, { refetchInterval: 10_000 });
  const claimable = useClientQuery("earnings.claimable", {}, { refetchInterval: 10_000 });
  const row = summary.data?.tokens[0];
  const chainAmount = claimable.data?.tokens.find(
    (item) => item.token.address === row?.token.address,
  )?.amount;
  const unlock = summary.data?.nextUnlockAt;
  const newcomer = links.query.data !== undefined && links.items.length === 0;
  return (
    <ProductPage title={copy.title} description={copy.description}>
      <FinishSetup />
      <ClaimCard />
      <Checklist links={links.items} />
      <QueryState
        pending={links.query.isPending}
        error={links.query.error}
        retry={() => void links.query.refetch()}
      >
        {newcomer ? (
          <>
            <p className="text-body bg-soft rounded-2xl px-5 py-4">{copy.tiles.none}</p>
            <EmptyState
              icon={Search01Icon}
              title={copy.newcomer.title}
              body={copy.newcomer.body}
              actions={
                <Button asChild>
                  <Link href={routes.earn.opportunities}>{copy.newcomer.action}</Link>
                </Button>
              }
            />
          </>
        ) : (
          <>
            <section className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-h4 text-ink font-medium">{copy.tiles.title}</h2>
                <Link
                  href={routes.earn.earnings}
                  className="text-ink text-sm underline underline-offset-2"
                >
                  {copy.tiles.all}
                </Link>
              </div>
              {row ? (
                <EarningsTiles
                  row={row}
                  claimableAmount={chainAmount}
                  nextUnlockAt={unlock ?? null}
                  compact
                />
              ) : null}
            </section>
            <div className="grid gap-6 lg:grid-cols-2">
              <ActiveLinks links={links.items} />
              <RecentSales />
            </div>
          </>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <OpportunitiesCard />
          <RecordCard />
        </div>
        <TestnetFootnote />
      </QueryState>
    </ProductPage>
  );
}
