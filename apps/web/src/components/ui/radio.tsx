"use client";

import { RadioGroup as RadixRadioGroup } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cx } from "./cx";

export type RadioOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export function RadioGroup<Value extends string>({
  value,
  onValueChange,
  options,
  label,
  orientation = "vertical",
  className,
}: {
  value: Value | undefined;
  onValueChange: (value: Value) => void;
  options: readonly RadioOption<Value>[];
  label: string;
  orientation?: "vertical" | "horizontal";
  className?: string | undefined;
}) {
  const id = useId();
  const choose = (next: string) => {
    const match = options.find((option) => option.value === next);
    if (match) onValueChange(match.value);
  };

  return (
    <RadixRadioGroup.Root
      value={value ?? ""}
      onValueChange={choose}
      aria-label={label}
      orientation={orientation}
      className={cx(
        "font-ui flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-wrap",
        className,
      )}
    >
      {options.map((option) => {
        const itemId = `${id}-${option.value}`;
        return (
          <div key={option.value} className="flex items-start gap-3">
            <RadixRadioGroup.Item
              id={itemId}
              value={option.value}
              disabled={option.disabled ?? false}
              aria-describedby={option.description ? `${itemId}-description` : undefined}
              className="data-[state=checked]:border-ink bg-surface ease-spring mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-pill-edge transition-colors duration-[423ms] hover:border-ink disabled:opacity-45"
            >
              <RadixRadioGroup.Indicator className="bg-ink block size-2.5 rounded-full" />
            </RadixRadioGroup.Item>
            <div className="flex flex-col gap-0.5">
              <label htmlFor={itemId} className="text-ink text-base">
                {option.label}
              </label>
              {option.description ? (
                <p id={`${itemId}-description`} className="text-subtle text-sm">
                  {option.description}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </RadixRadioGroup.Root>
  );
}
