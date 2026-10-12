"use client";

import type { Ref, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { controlClass, useField } from "./field";

export function Textarea({
  className,
  rows = 4,
  ref,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const field = useField();
  return (
    <textarea
      ref={ref}
      rows={rows}
      id={field?.controlId}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cx(controlClass, "min-h-20 resize-y px-3 py-2.5", className)}
      {...rest}
    />
  );
}
