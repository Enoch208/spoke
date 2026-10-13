"use client";

import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { homeCopy } from "../copy/home";
import type { LinkRow } from "../shared/campaigns";

const copy = homeCopy.checklist;

type Step = { key: string; label: string; done: boolean; run: () => void };

export function Checklist({ links }: { links: readonly LinkRow[] }) {
  const router = useRouter();
  const open = useUiStore((state) => state.open);
  const me = useClientQuery("account.me", {});
  const preferences = useClientQuery("account.preferences", {});
  const funding = useClientQuery("funding.status", {});
  const reputation = useClientQuery("reputation.mine", {});
  const hide = useClientMutation("account.updatePreferences", ["account.preferences"]);
  if (!me.data || !preferences.data || preferences.data.earnChecklistHidden) return null;
  const newest = links[0];
  const steps: Step[] = [
    ...(me.data.accountKind === "passkey"
      ? [
          {
            key: "backup",
            label: copy.backup,
            done: me.data.recovery.checkedAt !== null,
            run: () => open("M-04", { mode: "backup", origin: "settings" }),
          },
        ]
      : []),
    {
      key: "gas",
      label: copy.gas,
      done: funding.data?.covers?.createNode === true,
      run: () => open("M-06", {}),
    },
    {
      key: "link",
      label: copy.link,
      done: links.length > 0,
      run: () => {
        router.push(routes.earn.opportunities);
      },
    },
    {
      key: "share",
      label: copy.share,
      done: links.some((link) => link.visitsEstimate > 0 || link.conversions > 0),
      run: () => {
        if (newest) open("M-13", { nodeId: newest.nodeId });
        else router.push(routes.earn.opportunities);
      },
    },
    {
      key: "record",
      label: copy.record,
      done: reputation.data !== undefined && reputation.data.visibility !== "private",
      run: () => open("M-36", {}),
    },
  ];
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;
  return (
    <section className="bg-surface border-hairline grid gap-4 rounded-2xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.title}</h2>
        <span className="text-subtle text-sm">
          {fill(copy.progress, { done: String(done), total: String(steps.length) })}
        </span>
      </div>
      <ProgressBar value={done} max={steps.length} label={copy.title} tone="lime" />
      <ol className="grid gap-1">
        {steps.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              disabled={step.done}
              onClick={step.run}
              className={cx(
                "ease-spring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors duration-[423ms]",
                step.done ? "text-subtle" : "text-ink hover:bg-soft cursor-pointer",
              )}
            >
              <HugeiconsIcon
                icon={step.done ? CheckmarkCircle02Icon : CircleIcon}
                size={20}
                strokeWidth={1.8}
                aria-hidden="true"
                className={step.done ? "text-lime-ink" : "text-faint"}
              />
              <span className={cx("flex-1", step.done && "line-through")}>{step.label}</span>
              {step.done ? <span className="sr-only">{copy.done}</span> : null}
            </button>
          </li>
        ))}
      </ol>
      <Button
        size="sm"
        variant="ghost"
        className="justify-self-start"
        loading={hide.isPending}
        onClick={() => {
          hide.mutate({ earnChecklistHidden: true });
        }}
      >
        {copy.hide}
      </Button>
    </section>
  );
}
