"use client";

import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { cx } from "./cx";
import { controlClass, useField } from "./field";

export function Input({
  className,
  prefix,
  suffix,
  mono = false,
  ref,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  prefix?: ReactNode;
  suffix?: ReactNode;
  mono?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  const field = useField();
  const input = (
    <input
      ref={ref}
      id={field?.controlId}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cx(
        controlClass,
        "h-10 px-3",
        mono && "font-mono tabular-nums",
        Boolean(prefix) && "pl-9",
        Boolean(suffix) && "pr-16",
        className,
      )}
      {...rest}
    />
  );

  if (!prefix && !suffix) return input;

  return (
    <div className="relative">
      {prefix ? (
        <span className="text-subtle pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {prefix}
        </span>
      ) : null}
      {input}
      {suffix ? (
        <span className="text-subtle absolute inset-y-0 right-3 flex items-center text-sm">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
