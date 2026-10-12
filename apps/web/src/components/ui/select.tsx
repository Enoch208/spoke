"use client";

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Select as RadixSelect } from "radix-ui";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { controlClass, useField } from "./field";

export type SelectOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  disabled?: boolean;
};

export function Select<Value extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
}: {
  value: Value | undefined;
  onValueChange: (value: Value) => void;
  options: readonly SelectOption<Value>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string | undefined;
}) {
  const field = useField();
  const choose = (next: string) => {
    const match = options.find((option) => option.value === next);
    if (match) onValueChange(match.value);
  };

  return (
    <RadixSelect.Root value={value ?? ""} onValueChange={choose} disabled={disabled ?? false}>
      <RadixSelect.Trigger
        id={field?.controlId}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        className={cx(
          controlClass,
          "data-[placeholder]:text-faint flex h-10 items-center justify-between gap-2 px-3 text-left",
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="text-subtle">
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          collisionPadding={16}
          className="font-ui bg-surface shadow-frame data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in z-[60] max-h-[min(70vh,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled ?? false}
                className="text-ink data-[highlighted]:bg-pill data-[disabled]:text-faint relative flex min-h-10 cursor-pointer items-center rounded-lg py-2 pr-9 pl-3 text-base outline-none select-none"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-3">
                  <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} aria-hidden="true" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
