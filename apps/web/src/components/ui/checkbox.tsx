"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Checkbox as RadixCheckbox } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cx } from "./cx";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string | undefined;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className={cx("font-ui flex items-start gap-3", className)}>
      <RadixCheckbox.Root
        id={id}
        checked={checked}
        onCheckedChange={(state) => {
          onCheckedChange(state === true);
        }}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        className="data-[state=checked]:bg-ink data-[state=checked]:border-ink bg-surface ease-spring mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-pill-edge transition-colors duration-[423ms] hover:border-ink disabled:opacity-45"
      >
        <RadixCheckbox.Indicator className="text-page">
          <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} aria-hidden="true" />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-ink text-base">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-subtle text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
