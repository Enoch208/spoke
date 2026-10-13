"use client";

import { TestTube01Icon, UserSwitchIcon } from "@hugeicons/core-free-icons";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Piece } from "@/components/art/piece";
import { ArrowLink } from "@/components/ui/arrow-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PillLink } from "@/components/ui/pill-link";
import { featureNames, fill } from "@/lib/copy";
import type { FeatureKey } from "@/lib/features";
import { routes, withNext } from "@/lib/routes";
import { useFeatureGate } from "@/components/app/feature-gate";
import { growthCopy, roleCopy } from "./copy";
import { useIsDemo } from "./mode";
import { useViewAsStore } from "./roles";

export function DemoOnlyChip() {
  return (
    <Badge tone="lilac" icon={TestTube01Icon}>
      {growthCopy.demoOnly}
    </Badge>
  );
}

export function SampleChip() {
  const demo = useIsDemo();
  if (!demo) return null;
  return <Badge tone="lilac">{growthCopy.sample}</Badge>;
}

export function NotLiveState({
  feature,
  name,
  liveToday,
  action,
  variant = "section",
}: {
  feature: FeatureKey;
  name?: string;
  liveToday: string;
  action?: ReactNode;
  variant?: "section" | "compact";
}) {
  const pathname = usePathname();
  return (
    <Card padding="none" className="bg-soft overflow-hidden">
      <EmptyState
        variant={variant}
        illustration={
          <span className="bg-pill flex size-20 items-center justify-center rounded-3xl">
            <Piece id={`not-live-${feature}`} shape="pink" tone="lilac" className="h-12 w-auto" />
          </span>
        }
        chip={<DemoOnlyChip />}
        title={fill(growthCopy.notLive.title, { feature: name ?? featureNames[feature] })}
        body={`${growthCopy.notLive.body} ${liveToday}`}
        actions={
          <>
            <ArrowLink href={withNext(routes.demo, pathname)}>
              {growthCopy.notLive.tryDemo}
            </ArrowLink>
            <PillLink href={routes.labs}>{growthCopy.notLive.seeLive}</PillLink>
            {action}
          </>
        }
      />
    </Card>
  );
}

export function useDemoOnlyAction(feature: FeatureKey) {
  const gate = useFeatureGate();
  return (proceed: () => void) => {
    gate(feature, proceed);
  };
}

export function ViewAsBanner() {
  const demo = useIsDemo();
  const role = useViewAsStore((state) => state.role);
  const setRole = useViewAsStore((state) => state.setRole);
  if (!demo || role === null || role === "owner") return null;
  return (
    <div
      role="status"
      className="bg-sky-soft text-sky-ink font-ui flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Badge tone="sky" icon={UserSwitchIcon}>
          {roleCopy[role]}
        </Badge>
        {fill(growthCopy.viewing, { role: roleCopy[role] })}
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setRole(null);
        }}
      >
        {growthCopy.stop}
      </Button>
    </div>
  );
}
