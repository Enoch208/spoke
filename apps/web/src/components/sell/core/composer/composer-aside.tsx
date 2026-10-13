"use client";

import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { fill } from "@/lib/copy";
import { formatAmount, formatSplit } from "@/lib/format";
import { SplitPreviews } from "../studio/split-previews";
import { composerCopy } from "./copy";
import type { StepKey } from "./fields";
import { CampaignSummary } from "./summary";
import type { ComposerModel } from "./use-composer";

const copy = composerCopy.summary;

function AsideBody({
  model,
  onEdit,
  onSimulate,
}: {
  model: ComposerModel;
  onEdit: (step: StepKey) => void;
  onSimulate: (() => void) | undefined;
}) {
  const { derived, product, setup } = model;
  if (model.step === "rewards")
    return (
      <SplitPreviews
        key={product?.id ?? "none"}
        policy={derived.policy}
        defaultPriceMinor={product?.priceMinor ?? null}
        token={setup.token}
        onOpenSimulator={onSimulate}
      />
    );
  return (
    <CampaignSummary
      fields={model.fields}
      derived={derived}
      product={product}
      token={setup.token}
      mode={setup.mode}
      onEdit={onEdit}
    />
  );
}

export function ComposerAside(props: {
  model: ComposerModel;
  onEdit: (step: StepKey) => void;
  onSimulate?: (() => void) | undefined;
}) {
  if (props.model.step === "product") return null;
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col gap-4 overflow-y-auto pb-4">
        <AsideBody model={props.model} onEdit={props.onEdit} onSimulate={props.onSimulate} />
      </div>
    </aside>
  );
}

export function SummaryHandle(props: {
  model: ComposerModel;
  onEdit: (step: StepKey) => void;
  onSimulate?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  const { derived, setup } = props.model;
  const reward = derived.check.pricing?.rewardMinor ?? null;
  const weights = derived.check.resolved?.weightsBps ?? null;
  const label =
    reward !== null && weights
      ? fill(copy.handle, {
          reward: formatAmount(reward, setup.token),
          split: formatSplit(weights),
        })
      : copy.handleEmpty;
  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="bg-soft hover:bg-pill ease-spring flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm transition-colors duration-[423ms]"
      >
        <span className="text-ink truncate font-mono tabular-nums">{label}</span>
        <HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <Drawer open={open} onOpenChange={setOpen} title={copy.title}>
        <AsideBody
          model={props.model}
          onEdit={(step) => {
            setOpen(false);
            props.onEdit(step);
          }}
          onSimulate={props.onSimulate}
        />
      </Drawer>
    </div>
  );
}
