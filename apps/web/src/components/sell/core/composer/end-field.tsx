"use client";

import { useId } from "react";
import { cx } from "@/components/ui/cx";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fill } from "@/lib/copy";
import { formatTimestampFull } from "@/lib/format";
import { rulesCopy } from "./copy-rules";
import { localToMs, msToLocal } from "./derive-rules";
import { endPresets, type EndChoice } from "./fields";

function Choice({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cx(
        "ease-spring h-10 rounded-full border px-4 text-sm transition-colors duration-[423ms]",
        checked
          ? "bg-ink text-page border-ink"
          : "bg-surface text-ink border-line hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

export function EndField({
  value,
  onChange,
  error,
  now,
}: {
  value: EndChoice;
  onChange: (end: EndChoice) => void;
  error: string | undefined;
  now: number;
}) {
  const labelId = useId();
  const customMs = value.kind === "custom" ? localToMs(value.local) : null;
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-ink text-sm font-medium">
        {rulesCopy.ends}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {endPresets.map((days) => (
          <Choice
            key={days}
            checked={value.kind === "preset" && value.days === days}
            onSelect={() => {
              onChange({ kind: "preset", days });
            }}
          >
            {fill(rulesCopy.endPreset, { days: String(days) })}
          </Choice>
        ))}
        <Choice
          checked={value.kind === "custom"}
          onSelect={() => {
            if (value.kind !== "custom")
              onChange({ kind: "custom", local: msToLocal(now + 30 * 86_400_000) });
          }}
        >
          {rulesCopy.endCustom}
        </Choice>
      </div>
      {value.kind === "custom" ? (
        <Field
          label={rulesCopy.endCustomLabel}
          error={error}
          helper={
            customMs === null
              ? undefined
              : fill(rulesCopy.endCustomHelper, { utc: formatTimestampFull(new Date(customMs)) })
          }
          className="max-w-[360px]"
        >
          <Input
            type="datetime-local"
            value={value.local}
            onChange={(event) => {
              onChange({ kind: "custom", local: event.target.value });
            }}
          />
        </Field>
      ) : null}
      <p className="text-subtle text-sm">{rulesCopy.endHelper}</p>
    </div>
  );
}
