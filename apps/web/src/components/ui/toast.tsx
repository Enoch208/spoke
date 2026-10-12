"use client";

import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { HTMLAttributes, ReactNode } from "react";
import { common } from "@/lib/copy";
import { cx } from "./cx";

export type ToastTone = "info" | "success" | "error";

const toneStyle = {
  info: { icon: InformationCircleIcon, color: "text-sky" },
  success: { icon: CheckmarkCircle02Icon, color: "text-lime" },
  error: { icon: Alert02Icon, color: "text-pink" },
} as const;

export type ToastButton = { label: string; run: () => void };

export function Toast({
  tone,
  status,
  message,
  action,
  secondaryAction,
  count,
  onDismiss,
  className,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, "role"> & {
  tone: ToastTone;
  status?: string | undefined;
  message: ReactNode;
  action?: ToastButton | undefined;
  secondaryAction?: ToastButton | undefined;
  count?: number;
  onDismiss: () => void;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "font-ui bg-ink text-page shadow-frame data-[state=closed]:animate-toast-out animate-toast-in pointer-events-auto flex w-full items-start gap-3 rounded-2xl p-4 text-sm",
        className,
      )}
      {...rest}
    >
      <HugeiconsIcon
        icon={toneStyle[tone].icon}
        size={20}
        strokeWidth={1.8}
        aria-hidden="true"
        className={cx("mt-px shrink-0", toneStyle[tone].color)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="leading-[1.4]">
          {status ? <span className="font-medium">{status} · </span> : null}
          {message}
          {count && count > 1 ? <span className="text-faint"> +{count - 1}</span> : null}
        </p>
        {action || secondaryAction ? (
          <div className="flex flex-wrap gap-3">
            {action ? (
              <button
                type="button"
                onClick={action.run}
                className="text-lime font-medium underline-offset-2 hover:underline"
              >
                {action.label}
              </button>
            ) : null}
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.run}
                className="text-page/80 font-medium underline-offset-2 hover:underline"
              >
                {secondaryAction.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={common.dismiss}
        className="text-page/70 hover:text-page -mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
