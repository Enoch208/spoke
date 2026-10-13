"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { fill } from "@/lib/copy";
import { sharedFormCopy } from "../copy/forms";
import { normalizeHandle, type HandleCheck } from "./use-handle-check";

const copy = sharedFormCopy.handle;

function Suggestions({
  suggestions,
  onPick,
}: {
  suggestions: readonly string[];
  onPick: (handle: string) => void;
}) {
  return (
    <span className="mt-2 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => {
            onPick(suggestion);
          }}
          className="bg-pill border-pill-edge hover:border-ink ease-spring rounded-full border px-3 py-1 font-mono text-sm transition-colors duration-[423ms]"
        >
          @{suggestion}
        </button>
      ))}
    </span>
  );
}

const statusOf = (
  check: HandleCheck,
  value: string,
  race: readonly string[] | null,
  onPick: (handle: string) => void,
): { error?: ReactNode; status?: ReactNode } => {
  if (race)
    return {
      error: (
        <>
          {fill(copy.race, { handle: value })}
          <Suggestions suggestions={race} onPick={onPick} />
        </>
      ),
    };
  switch (check.kind) {
    case "invalid":
      return { error: copy.invalid };
    case "reserved":
      return { error: copy.reserved };
    case "taken":
      return {
        error:
          check.suggestions.length > 0 ? (
            <>
              {fill(copy.taken, { handle: value })}
              <Suggestions suggestions={check.suggestions} onPick={onPick} />
            </>
          ) : (
            fill(copy.takenNoSuggestions, { handle: value })
          ),
      };
    case "checking":
      return {
        status: (
          <span className="text-subtle flex items-center gap-2">
            <Spinner />
            {fill(copy.checking, { handle: value })}
          </span>
        ),
      };
    case "available":
      return {
        status: (
          <span className="text-lime-ink flex items-center gap-1.5">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
            {fill(copy.available, { handle: value })}
          </span>
        ),
      };
    case "unknown":
      return { status: <span className="text-subtle">{copy.unavailable}</span> };
    default:
      return {};
  }
};

export function HandleField({
  value,
  onChange,
  check,
  race = null,
  optional = true,
  disabled = false,
  helper,
  extra,
}: {
  value: string;
  onChange: (handle: string) => void;
  check: HandleCheck;
  race?: readonly string[] | null;
  optional?: boolean;
  disabled?: boolean;
  helper?: ReactNode;
  extra?: ReactNode;
}) {
  const state = statusOf(check, value, race, onChange);
  return (
    <Field label={copy.label} optional={optional} error={state.error} helper={helper ?? copy.rule}>
      <Input
        value={value}
        prefix="@"
        mono
        disabled={disabled}
        placeholder={copy.placeholder}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        onChange={(event) => {
          onChange(normalizeHandle(event.target.value));
        }}
      />
      <div aria-live="polite" className="min-h-0 text-sm empty:hidden">
        {state.status}
      </div>
      {extra}
    </Field>
  );
}
