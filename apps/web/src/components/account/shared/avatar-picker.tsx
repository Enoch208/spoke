"use client";

import { ShuffleIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { sharedFormCopy } from "../copy/forms";
import { avatarSeeds, PieceAvatar } from "./piece-avatar";

export function AvatarPicker({
  base,
  value,
  onChange,
  disabled = false,
}: {
  base: string;
  value: string;
  onChange: (seed: string) => void;
  disabled?: boolean;
}) {
  const [round, setRound] = useState(0);
  const options = [value, ...avatarSeeds(base, round).filter((seed) => seed !== value)].slice(0, 8);
  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={sharedFormCopy.avatar.label}
        className="grid w-fit grid-cols-4 gap-3"
      >
        {options.map((seed, index) => {
          const selected = seed === value;
          return (
            <button
              key={seed}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${sharedFormCopy.avatar.option} ${String(index + 1)}`}
              disabled={disabled}
              onClick={() => {
                onChange(seed);
              }}
              className={cx(
                "ease-spring rounded-full p-1 transition-[box-shadow] duration-[423ms] disabled:opacity-45",
                selected
                  ? "shadow-[0_0_0_2px_var(--color-ink)]"
                  : "hover:shadow-[0_0_0_2px_var(--color-line)]",
              )}
            >
              <PieceAvatar seed={seed} size="xl" />
            </button>
          );
        })}
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon={ShuffleIcon}
        disabled={disabled}
        className="w-fit"
        onClick={() => {
          setRound((current) => current + 1);
        }}
      >
        {sharedFormCopy.avatar.shuffle}
      </Button>
    </div>
  );
}
