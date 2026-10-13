"use client";

import { cx } from "@/components/ui/cx";

export function Segmented<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="bg-pill inline-flex rounded-3xl p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => {
            onChange(option.value);
          }}
          className={cx(
            "ease-spring h-8 cursor-pointer rounded-3xl px-3 text-sm whitespace-nowrap transition-colors duration-[423ms]",
            option.value === value
              ? "bg-surface text-ink shadow-frame"
              : "text-body hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
