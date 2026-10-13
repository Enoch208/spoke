"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { fill } from "@/lib/copy";
import type { TokenLike } from "@/lib/format";
import { simulatorCopy } from "./copy-simulator";

const copy = simulatorCopy;

export type ScenarioInput = {
  readonly pathLength: number;
  readonly buyerOnPath: boolean;
  readonly sameWallet: boolean;
  readonly budget: string;
};

export function SimulatorScenarios({
  value,
  onChange,
  token,
}: {
  value: ScenarioInput;
  onChange: (value: ScenarioInput) => void;
  token: TokenLike;
}) {
  const people = value.pathLength === 1 ? "1 person" : `${String(value.pathLength)} people`;
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-ink text-base font-medium">{copy.scenario}</h3>
      <Field label={copy.pathLength} helper={copy.pathHelper}>
        <div className="flex items-center gap-4">
          <Slider
            value={value.pathLength}
            min={1}
            max={8}
            label={copy.pathLength}
            valueText={fill(copy.pathLengthValue, { count: people })}
            onValueChange={(pathLength) => {
              onChange({ ...value, pathLength });
            }}
          />
          <span className="text-ink w-8 shrink-0 text-right font-mono tabular-nums">
            {value.pathLength}
          </span>
        </div>
      </Field>
      <Switch
        checked={value.buyerOnPath}
        label={copy.buyerOnPath}
        onCheckedChange={(buyerOnPath) => {
          onChange({ ...value, buyerOnPath });
        }}
      />
      <Switch
        checked={value.sameWallet}
        label={copy.sameWallet}
        onCheckedChange={(sameWallet) => {
          onChange({ ...value, sameWallet });
        }}
      />
      <Field label={copy.budgetLeft} helper={copy.budgetHelper} optional>
        <Input
          mono
          inputMode="decimal"
          suffix={token.symbol}
          value={value.budget}
          onChange={(event) => {
            onChange({ ...value, budget: event.target.value });
          }}
        />
      </Field>
    </section>
  );
}
