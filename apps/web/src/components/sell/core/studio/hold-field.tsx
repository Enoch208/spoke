"use client";

import { useId } from "react";
import { cx } from "@/components/ui/cx";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { studioCopy } from "./copy";
import { holdPresets, type HoldChoice, type HoldUnit } from "./terms";

const copy = studioCopy.hold;
const units: readonly HoldUnit[] = ["minutes", "hours", "days"];

function Pill({
  checked,
  onSelect,
  disabled,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean | undefined;
  children: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        "ease-spring h-10 rounded-full border px-4 text-sm transition-colors duration-[423ms] disabled:opacity-45",
        checked
          ? "bg-ink text-page border-ink"
          : "bg-surface text-ink border-line hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

export function HoldField({
  value,
  onChange,
  error,
  disabled,
  hideLabel = false,
}: {
  value: HoldChoice;
  onChange: (hold: HoldChoice) => void;
  error: string | undefined;
  disabled?: boolean | undefined;
  hideLabel?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className={cx("text-ink text-sm font-medium", hideLabel && "sr-only")}>
        {copy.label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {holdPresets.map((seconds) => (
          <Pill
            key={seconds}
            disabled={disabled}
            checked={value.kind === "preset" && value.seconds === seconds}
            onSelect={() => {
              onChange({ kind: "preset", seconds });
            }}
          >
            {copy.presets[seconds]}
          </Pill>
        ))}
        <Pill
          disabled={disabled}
          checked={value.kind === "custom"}
          onSelect={() => {
            if (value.kind !== "custom") onChange({ kind: "custom", amount: "2", unit: "days" });
          }}
        >
          {copy.custom}
        </Pill>
      </div>
      {value.kind === "custom" ? (
        <div className="grid max-w-[360px] grid-cols-[1fr_1fr] gap-3">
          <Field label={copy.amount} error={error}>
            <Input
              mono
              inputMode="numeric"
              disabled={disabled}
              value={value.amount}
              onChange={(event) => {
                onChange({ ...value, amount: event.target.value });
              }}
            />
          </Field>
          <Field label={copy.unit}>
            <Select<HoldUnit>
              value={value.unit}
              disabled={disabled ?? false}
              onValueChange={(unit) => {
                onChange({ ...value, unit });
              }}
              options={units.map((unit) => ({ value: unit, label: copy.units[unit] }))}
            />
          </Field>
        </div>
      ) : null}
      <p className="text-subtle text-sm">
        {value.kind === "custom" ? `${copy.customHelper} ` : ""}
        {copy.helper}
      </p>
    </div>
  );
}
