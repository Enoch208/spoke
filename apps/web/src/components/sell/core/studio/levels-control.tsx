"use client";

import { useId } from "react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { numberWord } from "@/lib/format";
import { studioCopy } from "./copy";
import { levelChoices } from "./terms";

const copy = studioCopy.levels;

export function LevelsControl({
  levels,
  onChange,
  disabled,
}: {
  levels: number;
  onChange: (levels: number) => void;
  disabled?: boolean | undefined;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-ink text-sm font-medium">
        {copy.label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="bg-pill grid w-full max-w-[320px] grid-cols-5 gap-1 rounded-full p-1"
      >
        {levelChoices.map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={choice === levels}
            disabled={disabled}
            onClick={() => {
              if (choice !== levels) onChange(choice);
            }}
            className={cx(
              "ease-spring h-10 rounded-full font-mono text-base tabular-nums transition-colors duration-[423ms] disabled:opacity-45",
              choice === levels ? "bg-ink text-page" : "text-ink hover:bg-surface",
            )}
          >
            {choice}
          </button>
        ))}
      </div>
      <p className="text-subtle text-sm">
        {levels === 1
          ? copy.helperOne
          : fill(copy.helper, { count: `${numberWord(levels)} people` })}{" "}
        {copy.contract}
      </p>
    </div>
  );
}
