"use client";

import { Award01Icon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { PartnerPassport } from "@/components/public/profile/partner-passport";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductPage, QueryState } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { reputationCopy as copy } from "../copy/reputation";
import { Contests, Portable } from "./contests";
import { Diversity } from "./diversity";
import { HeaderCard } from "./header-card";
import { MerchantsSee } from "./merchants-see";
import { Methodology } from "./methodology";
import { Receipts } from "./receipts";
import { RecordTiles } from "./record-tiles";

export function ReputationPage() {
  const open = useUiStore((state) => state.open);
  const profile = useClientQuery("reputation.mine", {}, { refetchInterval: 20_000 });
  const me = useClientQuery("account.me", {});
  const refunded = useClientQuery("earnings.byConversion", { state: "refunded", limit: 100 });
  const data = profile.data;
  const receipts = data?.evidence.items ?? [];
  const tokenKeys = new Set(receipts.map((receipt) => receipt.token.address.toLowerCase()));
  const token =
    tokenKeys.size === 1 &&
    data?.evidence.nextCursor === null &&
    receipts.length === data.settledConversions
      ? (receipts[0]?.token ?? null)
      : null;
  return (
    <ProductPage title={copy.title} description={copy.description}>
      <QueryState
        pending={profile.isPending}
        error={profile.error}
        retry={() => void profile.refetch()}
      >
        {data ? (
          <>
            <HeaderCard me={me.data} profile={data} />
            {data.visibility === "private" ? (
              <div className="bg-soft flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
                <p className="text-body flex items-center gap-2 text-sm">
                  <HugeiconsIcon
                    icon={ViewOffIcon}
                    size={18}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  {copy.privateBanner}
                </p>
                <Button size="sm" variant="secondary" onClick={() => open("M-36", {})}>
                  {copy.header.change}
                </Button>
              </div>
            ) : null}
            <Methodology profile={data} />
            <RecordTiles
              profile={data}
              token={token}
              refundedCount={refunded.data?.items.length ?? 0}
            />
            {data.settledConversions === 0 ? (
              <EmptyState
                icon={Award01Icon}
                title={copy.empty}
                actions={
                  <Button asChild>
                    <Link href={routes.earn.opportunities}>{copy.emptyAction}</Link>
                  </Button>
                }
              />
            ) : (
              <Diversity profile={data} />
            )}
            <PartnerPassport profile={data} owner />
            <Receipts receipts={receipts} />
            <MerchantsSee profile={data} address={me.data?.address ?? null} />
            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
              <Portable />
              <Contests />
            </div>
          </>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
