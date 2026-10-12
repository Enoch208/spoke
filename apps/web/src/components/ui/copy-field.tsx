"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { IconButton } from "./icon-button";
import { useCopy } from "./use-copy";

export function CopyButton({
  value,
  label,
  copiedMessage,
  size = "sm",
  className,
}: {
  value: string;
  label: string;
  copiedMessage: string;
  size?: "sm" | "md";
  className?: string | undefined;
}) {
  const copy = useCopy();
  return (
    <IconButton
      icon={Copy01Icon}
      label={label}
      size={size}
      className={className}
      onClick={() => {
        void copy(value, copiedMessage);
      }}
    />
  );
}

export function CopyField({
  value,
  display,
  label,
  copiedMessage,
  mono = true,
  action,
  className,
}: {
  value: string;
  display?: ReactNode;
  label: string;
  copiedMessage: string;
  mono?: boolean;
  action?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cx(
        "font-ui bg-soft flex min-h-10 items-center gap-2 rounded-xl border border-line py-1 pr-1 pl-3",
        className,
      )}
    >
      <span
        className={cx("text-ink min-w-0 flex-1 truncate text-sm", mono && "font-mono tabular-nums")}
        title={value}
      >
        {display ?? value}
      </span>
      {action}
      <CopyButton value={value} label={label} copiedMessage={copiedMessage} />
    </div>
  );
}
