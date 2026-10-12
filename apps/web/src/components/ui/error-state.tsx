"use client";

import { Alert02Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { common } from "@/lib/copy";
import { CopyButton } from "./copy-field";
import { cx } from "./cx";
import { KeyValue } from "./key-value";

export type ErrorDetails = { code?: string | undefined; requestId?: string | undefined };

const layouts = {
  page: "min-h-[50vh] items-center justify-center gap-4 px-6 py-16 text-center",
  section: "items-center gap-3 rounded-2xl border border-hairline px-6 py-10 text-center",
  inline: "items-start gap-2 rounded-xl bg-pink-soft px-4 py-3 text-left",
} as const;

function Details({ details }: { details: ErrorDetails }) {
  const summary = [details.code, details.requestId].filter(Boolean).join(" · ");
  if (!summary) return null;
  return (
    <details className="group w-full max-w-[420px] text-left">
      <summary className="text-subtle hover:text-ink flex cursor-pointer list-none items-center gap-1 text-sm">
        {common.details}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={16}
          strokeWidth={1.8}
          aria-hidden="true"
          className="ease-spring transition-transform duration-[423ms] group-open:rotate-180"
        />
      </summary>
      <div className="bg-soft mt-2 flex items-start gap-2 rounded-xl px-3">
        <KeyValue
          className="min-w-0 flex-1"
          items={[
            ...(details.code
              ? [{ key: "code", label: common.errorCode, value: details.code, mono: true }]
              : []),
            ...(details.requestId
              ? [
                  {
                    key: "reference",
                    label: common.referenceLabel,
                    value: details.requestId,
                    mono: true,
                  },
                ]
              : []),
          ]}
        />
        <CopyButton
          value={summary}
          label={common.copyDetails}
          copiedMessage={common.copyDetails}
          className="mt-2"
        />
      </div>
    </details>
  );
}

export function ErrorState({
  variant = "section",
  icon = Alert02Icon,
  title,
  body,
  actions,
  details,
  className,
}: {
  variant?: keyof typeof layouts;
  icon?: IconSvgElement;
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  details?: ErrorDetails;
  className?: string | undefined;
}) {
  const inline = variant === "inline";
  return (
    <div
      role={inline ? "alert" : undefined}
      className={cx("font-ui flex flex-col", layouts[variant], className)}
    >
      <div className={cx("flex gap-3", inline ? "items-start" : "flex-col items-center")}>
        <span
          aria-hidden="true"
          className={cx(
            "flex shrink-0 items-center justify-center rounded-full",
            inline ? "text-pink-ink mt-0.5" : "bg-pink-soft text-pink-ink size-12",
          )}
        >
          <HugeiconsIcon icon={icon} size={inline ? 18 : 22} strokeWidth={1.8} />
        </span>
        <div className={cx("flex flex-col gap-1", !inline && "items-center")}>
          {variant === "page" ? (
            <h1 className="font-display text-h4 text-ink font-medium">{title}</h1>
          ) : (
            <p className={cx("text-ink font-medium", inline ? "text-sm" : "text-base")}>{title}</p>
          )}
          {body ? (
            <p
              className={cx(
                inline ? "text-pink-ink text-sm" : "text-subtle max-w-[46ch] text-base",
              )}
            >
              {body}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className={cx("flex flex-wrap gap-3", inline ? "pl-8" : "mt-1 justify-center")}>
          {actions}
        </div>
      ) : null}
      {details ? <Details details={details} /> : null}
    </div>
  );
}
