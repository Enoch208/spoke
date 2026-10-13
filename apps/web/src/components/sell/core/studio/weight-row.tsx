"use client";

import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { KeyboardEvent } from "react";
import { cx } from "@/components/ui/cx";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { fill } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { studioCopy } from "./copy";
import { parsePercent } from "./terms";

const copy = studioCopy.weights;

export const levelLabel = (level: number) =>
  level === 1
    ? copy.levelOne
    : level === 2
      ? copy.levelTwo
      : fill(copy.levelN, { level: String(level), steps: String(level - 1) });

export function WeightRow({
  level,
  value,
  onText,
  onStep,
  onSlide,
  takesRest,
  error,
  amount,
  token,
  slider,
  disabled,
}: {
  level: number;
  value: string;
  onText: (text: string) => void;
  onStep: (deltaBps: number) => void;
  onSlide: (bps: number) => void;
  takesRest: boolean;
  error: string | undefined;
  amount: bigint | null;
  token: TokenLike;
  slider: boolean;
  disabled?: boolean | undefined;
}) {
  const parsed = parsePercent(value);
  const bps = parsed.ok ? parsed.value : null;
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const size = event.shiftKey ? 100 : 1;
    onStep(event.key === "ArrowUp" ? size : -size);
  };
  return (
    <div className="border-hairline grid gap-2 border-t py-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_112px_72px_minmax(84px,auto)] sm:items-center sm:gap-3">
      <div className="min-w-0 sm:col-span-4">
        <p className="text-ink text-sm font-medium">{levelLabel(level)}</p>
        {takesRest ? <p className="text-subtle text-sm">{copy.takesRest}</p> : null}
      </div>
      {slider ? (
        <Slider
          value={bps ?? 0}
          min={1}
          max={10_000}
          label={fill(copy.weightLabel, { level: String(level) })}
          disabled={(disabled ?? false) || takesRest}
          onValueChange={onSlide}
        />
      ) : (
        <div aria-hidden="true" className="bg-pill h-2 overflow-hidden rounded-full">
          <div
            className={cx(
              "ease-spring h-full origin-left rounded-full transition-transform duration-[423ms]",
              level === 1 ? "bg-ink" : "bg-lilac-deep",
            )}
            style={{ transform: `scaleX(${String(Math.min(1, (bps ?? 0) / 10_000))})` }}
          />
        </div>
      )}
      <div className="grid grid-cols-[112px_72px_minmax(0,1fr)] items-center gap-3 sm:contents">
        <Field label={fill(copy.weightLabel, { level: String(level) })} hideLabel>
          <div className="flex items-center gap-1.5">
            <Input
              aria-invalid={error ? true : undefined}
              mono
              inputMode="decimal"
              maxLength={6}
              readOnly={takesRest}
              disabled={disabled}
              value={value}
              onKeyDown={takesRest ? undefined : keys}
              onChange={(event) => {
                onText(event.target.value);
              }}
              className={cx("text-right", takesRest && "bg-soft")}
            />
            <span aria-hidden="true" className="text-subtle text-sm">
              %
            </span>
          </div>
        </Field>
        <span className="text-subtle font-mono text-sm tabular-nums">
          {bps === null ? "—" : fill(copy.bps, { bps: String(bps) })}
        </span>
        <span className="text-ink text-right font-mono text-sm tabular-nums">
          {amount === null ? "—" : formatAmount(amount, token)}
        </span>
      </div>
      {error ? (
        <p className="text-pink-ink flex items-start gap-1.5 text-sm sm:col-span-4">
          <HugeiconsIcon
            icon={Alert01Icon}
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
          />
          {error}
        </p>
      ) : null}
    </div>
  );
}
