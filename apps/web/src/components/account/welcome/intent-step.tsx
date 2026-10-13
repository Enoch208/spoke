"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { welcomeCopy as copy, type WelcomeIntent } from "../copy/welcome";

export function IntentStep({
  value,
  onChange,
}: {
  value: WelcomeIntent | null;
  onChange: (value: WelcomeIntent) => void;
}) {
  return (
    <div role="radiogroup" aria-label={copy.titles[0]} className="grid gap-3 sm:grid-cols-2">
      {copy.intents.map((intent) => (
        <button
          key={intent.value}
          type="button"
          role="radio"
          aria-checked={value === intent.value}
          onClick={() => {
            onChange(intent.value);
          }}
          className={cx(
            "border-hairline bg-surface hover:border-ink ease-spring flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors duration-[423ms]",
            value === intent.value && "border-ink bg-lime-soft shadow-[0_0_0_1px_var(--color-ink)]",
          )}
        >
          <span className="bg-pill flex size-10 items-center justify-center rounded-xl">
            <HugeiconsIcon icon={intent.icon} size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            <span className="text-ink block font-medium">{intent.title}</span>
            <span className="text-body mt-1 block text-sm">{intent.body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
