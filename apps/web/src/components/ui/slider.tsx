"use client";

import { Slider as RadixSlider } from "radix-ui";
import { cx } from "./cx";
import { useField } from "./field";

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  label,
  valueText,
  disabled,
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  valueText?: string;
  disabled?: boolean;
  className?: string | undefined;
}) {
  const field = useField();
  return (
    <RadixSlider.Root
      value={[value]}
      onValueChange={([next]) => {
        if (next !== undefined) onValueChange(next);
      }}
      min={min}
      max={max}
      step={step}
      disabled={disabled ?? false}
      className={cx(
        "relative flex h-6 w-full touch-none items-center select-none data-[disabled]:opacity-45",
        className,
      )}
    >
      <RadixSlider.Track className="bg-pill-edge relative h-1.5 grow overflow-hidden rounded-full">
        <RadixSlider.Range className="bg-ink absolute h-full rounded-full" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        id={field?.controlId}
        aria-label={label}
        aria-valuetext={valueText}
        aria-describedby={field?.describedBy}
        className="bg-surface border-ink ease-spring block size-5 rounded-full border-2 shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-[423ms] hover:scale-110"
      />
    </RadixSlider.Root>
  );
}
