"use client";

import { Alert01Icon, InformationCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { launchCopy } from "./copy-launch";
import type { LaunchState } from "./launch-state";

const copy = launchCopy;

export type LaunchIssue = { readonly message: string; readonly action: ReactNode };

export function LaunchStatus({ state }: { state: LaunchState }) {
  const open = useUiStore((store) => store.open);
  if (state.kind === "active")
    return (
      <div className="bg-sky-soft text-sky-ink flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={16}
            strokeWidth={1.8}
            className="animate-spin"
          />
          {copy.launching}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            open("M-11", { txId: state.txId });
          }}
        >
          {copy.showProgress}
        </Button>
      </div>
    );
  if (state.kind === "stuck")
    return (
      <div className="bg-amber-soft text-amber-ink flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm">
        <span>
          {state.funded
            ? copy.fundedNotLive
            : fill(copy.createdNotFunded, { campaignId: state.campaignId })}
        </span>
        <span className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              open("M-11", { txId: state.txId });
            }}
          >
            {copy.showProgress}
          </Button>
          <Button asChild size="sm">
            <Link href={routeTo.sellCampaign(state.campaignId)}>{copy.openCampaign}</Link>
          </Button>
        </span>
      </div>
    );
  return null;
}

export function LaunchStep({
  deposit,
  state,
  issue,
}: {
  deposit: string;
  state: LaunchState;
  issue: LaunchIssue | null;
}) {
  const steps = [
    { title: copy.steps.create, helper: copy.steps.createHelper },
    { title: fill(copy.steps.approve, { deposit }), helper: copy.steps.approveHelper },
    {
      title: fill(copy.steps.deposit, { deposit }),
      helper: fill(copy.steps.depositHelper, { deposit }),
    },
    { title: copy.steps.live, helper: copy.steps.liveHelper },
  ];
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
          {copy.title}
        </h2>
        <p className="text-subtle mt-1 text-sm">{copy.description}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span className="bg-pill text-ink flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm">
              {index + 1}
            </span>
            <span className="flex flex-col">
              <span className="text-ink text-sm font-medium">{step.title}</span>
              <span className="text-subtle text-sm">{step.helper}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="bg-sky-soft text-sky-ink flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={16}
          strokeWidth={1.8}
          className="mt-0.5 shrink-0"
        />
        <span>
          {copy.note} {copy.depositFirst}
        </span>
      </p>
      <LaunchStatus state={state} />
      {issue ? (
        <div
          role="alert"
          className="bg-pink-soft text-pink-ink flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm"
        >
          <span className="flex items-start gap-2">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={16}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0"
            />
            {issue.message}
          </span>
          {issue.action}
        </div>
      ) : null}
    </Card>
  );
}
