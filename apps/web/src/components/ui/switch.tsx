"use client";

import { Switch as RadixSwitch } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cx } from "./cx";

export function Switch({
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
    <div className={cx("font-ui flex items-start justify-between gap-4", className)}>
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
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        className="data-[state=checked]:bg-ink bg-pill-edge ease-spring relative h-6 w-10 shrink-0 rounded-full transition-colors duration-[423ms] disabled:opacity-45"
      >
        <RadixSwitch.Thumb className="bg-surface ease-spring block size-5 translate-x-0.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-[423ms] data-[state=checked]:translate-x-[18px]" />
      </RadixSwitch.Root>
    </div>
  );
}
