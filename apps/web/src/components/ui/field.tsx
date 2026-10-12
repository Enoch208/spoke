"use client";

import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createContext, useContext, useId, type ReactNode } from "react";
import { cx } from "./cx";

type FieldIds = {
  controlId: string;
  describedBy: string | undefined;
  invalid: boolean;
};

const FieldContext = createContext<FieldIds | null>(null);

export const useField = (): FieldIds | null => useContext(FieldContext);

export const controlClass = cx(
  "font-ui bg-surface text-ink placeholder:text-faint w-full rounded-xl border border-line text-base",
  "transition-colors duration-[423ms] ease-spring hover:border-pill-edge focus-visible:border-ink",
  "disabled:bg-soft disabled:text-subtle disabled:cursor-not-allowed",
  "aria-invalid:border-pink-ink",
);

export function Field({
  label,
  helper,
  error,
  optional = false,
  hideLabel = false,
  className,
  children,
}: {
  label: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  hideLabel?: boolean;
  className?: string | undefined;
  children: ReactNode;
}) {
  const controlId = useId();
  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;
  const describedBy =
    [error ? errorId : null, helper ? helperId : null].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ controlId, describedBy, invalid: Boolean(error) }}>
      <div className={cx("font-ui flex flex-col gap-1.5", className)}>
        <label
          htmlFor={controlId}
          className={cx("text-ink text-sm font-medium", hideLabel && "sr-only")}
        >
          {label}
          {optional ? <span className="text-subtle font-normal"> (optional)</span> : null}
        </label>
        {children}
        {error ? (
          <p id={errorId} className="text-pink-ink flex items-start gap-1.5 text-sm">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={16}
              strokeWidth={1.8}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <span>{error}</span>
          </p>
        ) : null}
        {helper ? (
          <p id={helperId} className="text-subtle text-sm">
            {helper}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
