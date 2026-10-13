"use client";

import Link from "next/link";
import { ProductPage } from "@/components/product/page";
import { Callout } from "@/components/public/shared/callout";
import { ReportButton } from "@/components/public/shared/report-button";
import { ComponentRows, DirectChainCheck } from "@/components/public/status/component-rows";
import { ContractsTable } from "@/components/public/status/contracts-table";
import { ActiveIncidents, PastIncidents } from "@/components/public/status/incidents";
import { OverallBanner } from "@/components/public/status/overall-banner";
import { overallState } from "@/components/public/status/overall";
import { statusCopy } from "@/components/public/status/status-copy";
import { Card } from "@/components/ui/card";
import { useClientContext } from "@/lib/client/provider";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";

const pollMs = 15_000;

export function StatusPage() {
  const { mode } = useClientContext();
  const health = useClientQuery("system.health", {}, { live: true, refetchInterval: pollMs });
  const status = useClientQuery("system.status", {}, { live: true, refetchInterval: pollMs });
  const healthFailed = health.isError && !health.data;
  const state = overallState({ health: health.data, status: status.data, healthFailed });
  const checkedAt = Math.max(health.dataUpdatedAt, health.errorUpdatedAt) || null;
  return (
    <ProductPage title={statusCopy.title} description={statusCopy.description}>
      {mode === "demo" ? <Callout tone="info">{statusCopy.demoNote}</Callout> : null}
      <OverallBanner
        state={state}
        checkedAt={checkedAt}
        refreshing={health.isFetching || status.isFetching}
        onRefresh={() => {
          void health.refetch();
          void status.refetch();
        }}
      />
      {healthFailed ? <DirectChainCheck /> : null}
      {status.data ? <ActiveIncidents status={status.data} now={checkedAt ?? 0} /> : null}
      {healthFailed ? null : <ComponentRows health={health.data} status={status.data} />}
      <Card padding="lg" className="flex flex-col gap-2">
        <h2 className="font-display text-h4 text-ink font-medium">{statusCopy.explainerHeading}</h2>
        <p className="text-body">{statusCopy.explainer}</p>
        <Link
          href={`${routes.support}#sale-missing`}
          className="text-ink w-fit text-sm underline underline-offset-2"
        >
          {statusCopy.helpLink}
        </Link>
      </Card>
      {healthFailed ? null : <ContractsTable chainId={health.data?.chainId ?? activeChain.id} />}
      {status.data ? <PastIncidents status={status.data} now={checkedAt ?? 0} /> : null}
      <div className="border-hairline flex justify-end border-t pt-4">
        <ReportButton label={statusCopy.report} />
      </div>
    </ProductPage>
  );
}
