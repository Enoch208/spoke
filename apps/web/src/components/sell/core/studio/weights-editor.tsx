"use client";

import { Alert01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fill } from "@/lib/copy";
import type { TokenLike } from "@/lib/format";
import { studioCopy } from "./copy";
import { rewardErrors } from "./copy-errors";
import { bpsText, parsedBps, type StudioTerms } from "./terms";
import type { TermsCheck } from "./validate";
import { WeightRow } from "./weight-row";
import {
  balanceLevelOne,
  editWeight,
  presetNames,
  presetWeights,
  stepWeight,
  upstreamHeavier,
  weightTotal,
  type PresetName,
  type WeightEdit,
} from "./weights";

const copy = studioCopy.weights;

function TotalRow({ weights }: { weights: readonly string[] }) {
  const total = weightTotal(weights);
  if (total.kind === "incomplete") return null;
  const tone =
    total.kind === "exact"
      ? "text-lime-ink"
      : total.kind === "under"
        ? "text-amber-ink"
        : "text-pink-ink";
  const text =
    total.kind === "exact"
      ? copy.totalExact
      : total.kind === "under"
        ? fill(copy.totalUnder, { total: bpsText(total.totalBps), left: bpsText(total.leftBps) })
        : fill(copy.totalOver, { total: bpsText(total.totalBps), over: bpsText(total.overBps) });
  return (
    <p className={cx("flex items-center gap-2 font-mono text-sm tabular-nums", tone)}>
      <HugeiconsIcon
        icon={total.kind === "exact" ? Tick02Icon : Alert01Icon}
        size={16}
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="font-ui text-subtle">{copy.total}</span>
      {text}
    </p>
  );
}

export function WeightsEditor({
  terms,
  onChange,
  check,
  showErrors,
  amounts,
  token,
  slider = false,
  disabled,
}: {
  terms: StudioTerms;
  onChange: (terms: StudioTerms) => void;
  check: TermsCheck;
  showErrors: boolean;
  amounts: readonly bigint[] | null;
  token: TokenLike;
  slider?: boolean;
  disabled?: boolean | undefined;
}) {
  const [refused, setRefused] = useState(false);
  const apply = (result: WeightEdit, keepTotal = terms.keepTotal) => {
    if (!result.ok) {
      setRefused(true);
      return;
    }
    setRefused(false);
    onChange({ ...terms, keepTotal, weights: result.weights });
  };
  const total = weightTotal(terms.weights);
  const fixable = !terms.keepTotal && total.kind !== "exact" && balanceLevelOne(terms.weights).ok;
  const bps = parsedBps(terms.weights);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Switch
          className="min-w-0 flex-1"
          checked={terms.keepTotal}
          disabled={disabled ?? false}
          label={copy.keepTotal}
          description={copy.keepTotalHelper}
          onCheckedChange={(on) => {
            apply(on ? balanceLevelOne(terms.weights) : { ok: true, weights: terms.weights }, on);
          }}
        />
        <div className="w-full sm:w-44">
          <Select<PresetName>
            value={undefined}
            placeholder={copy.resetTo}
            disabled={disabled ?? false}
            onValueChange={(name) => {
              apply({ ok: true, weights: presetWeights(name, terms.weights.length) });
            }}
            options={presetNames.map((name) => ({ value: name, label: copy.presets[name] }))}
          />
        </div>
      </div>
      <div>
        {terms.weights.map((weight, index) => (
          <WeightRow
            key={String(index)}
            level={index + 1}
            value={weight}
            token={token}
            slider={slider}
            disabled={disabled}
            takesRest={terms.keepTotal && index === 0}
            amount={amounts?.[index] ?? null}
            error={
              index === 0 && refused
                ? rewardErrors.levelOneFloor
                : showErrors
                  ? check.errors.levels[index]
                  : undefined
            }
            onText={(text) => {
              apply(editWeight(terms.weights, index, text, terms.keepTotal));
            }}
            onStep={(delta) => {
              apply(stepWeight(terms.weights, index, delta, terms.keepTotal));
            }}
            onSlide={(value) => {
              apply(editWeight(terms.weights, index, bpsText(value), terms.keepTotal));
            }}
          />
        ))}
      </div>
      {!terms.keepTotal ? (
        <div className="bg-soft flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2">
          <TotalRow weights={terms.weights} />
          {fixable ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                apply(balanceLevelOne(terms.weights));
              }}
            >
              {copy.giveRest}
            </Button>
          ) : null}
        </div>
      ) : null}
      {showErrors && check.errors.weights ? (
        <p role="alert" className="text-pink-ink text-sm">
          {check.errors.weights}
        </p>
      ) : null}
      {bps && upstreamHeavier(bps) ? (
        <p className="bg-amber-soft text-amber-ink rounded-xl px-3 py-2.5 text-sm">
          {copy.upstream}
        </p>
      ) : null}
    </div>
  );
}
