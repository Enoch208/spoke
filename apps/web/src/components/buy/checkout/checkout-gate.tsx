"use client";

import { Search01Icon, UnavailableIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { common } from "@/lib/copy";
import { publicEnv } from "@/lib/public-env";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { blockedActionLabels, blockedCopy } from "../copy/blocked";
import type { Checkout } from "./use-checkout";

function CheckoutSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-6 lg:grid-cols-12">
      <span className="sr-only">{common.loading}</span>
      <div className="flex flex-col gap-4 lg:col-span-7">
        <SkeletonCard className="h-56" />
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-40" />
      </div>
      <SkeletonCard className="h-96 lg:col-span-5" />
    </div>
  );
}

export function CheckoutGate({ checkout, children }: { checkout: Checkout; children: ReactNode }) {
  const campaign = checkout.campaign;
  if (checkout.mode === "live" && !publicEnv.NEXT_PUBLIC_PROTOCOL_ADDRESS)
    return (
      <EmptyState
        variant="page"
        icon={UnavailableIcon}
        title={blockedCopy.notDeployed.title}
        body={blockedCopy.notDeployed.body}
        actions={
          <Button
            onClick={() => {
              useUiStore.getState().open("M-42", { intent: "enter", persona: "buyer" });
            }}
          >
            {blockedActionLabels.demo}
          </Button>
        }
      />
    );
  if (campaign.isPending) return <CheckoutSkeleton />;
  if (campaign.error?.code === "NOT_FOUND")
    return (
      <EmptyState
        variant="page"
        icon={Search01Icon}
        title={blockedCopy.notFound.title}
        body={blockedCopy.notFound.body}
        actions={
          <Button asChild>
            <Link href={routes.explore}>{blockedActionLabels.explore}</Link>
          </Button>
        }
      />
    );
  if (campaign.error)
    return (
      <ErrorState
        title={blockedCopy.other.title}
        body={campaign.error.message}
        details={{ code: campaign.error.code, requestId: campaign.error.requestId ?? undefined }}
        actions={
          <Button variant="secondary" onClick={() => void campaign.refetch()}>
            {common.tryAgain}
          </Button>
        }
      />
    );
  return children;
}
