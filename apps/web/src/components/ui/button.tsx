"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Slot } from "radix-ui";
import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./spinner";
import { Tooltip } from "./tooltip";

export const buttonVariants = {
  primary: "bg-ink text-page hover:bg-ink/85",
  secondary:
    "bg-pill text-ink border border-pill-edge hover:border-ink hover:bg-transparent [transition-timing-function:var(--ease-spring),var(--ease-edge-out)] hover:[transition-timing-function:var(--ease-spring),var(--ease-edge-in)]",
  ghost: "text-ink hover:text-body [transition-duration:0ms]",
  danger: "bg-pink-soft text-pink-ink border border-transparent hover:border-ink",
} as const;

export const buttonSizes = {
  sm: "h-8 px-3.5 text-sm",
  md: "h-10 px-5 text-base",
  lg: "h-[46px] px-[23px] text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export const buttonClass = (
  variant: ButtonVariant,
  size: ButtonSize,
  block = false,
  loading = false,
) =>
  cx(
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-3xl font-medium whitespace-nowrap select-none",
    "[transition-duration:423ms] [transition-property:background-color,border-color,color,opacity] [transition-timing-function:var(--ease-spring)]",
    "disabled:pointer-events-none",
    !loading && "disabled:opacity-45",
    buttonVariants[variant],
    buttonSizes[size],
    block && "w-full",
  );

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: IconSvgElement;
  loading?: boolean;
  loadingLabel?: ReactNode;
  disabledReason?: string;
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  icon,
  loading = false,
  loadingLabel,
  disabledReason,
  asChild = false,
  disabled,
  className,
  children,
  type = "button",
  "aria-describedby": describedBy,
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const isDisabled = Boolean(disabled) || loading;
  const showReason = Boolean(disabled) && !loading && Boolean(disabledReason);
  const classes = cx(buttonClass(variant, size, block, loading), className);

  if (asChild) {
    return (
      <Slot.Root className={classes} aria-describedby={describedBy} {...rest}>
        {children}
      </Slot.Root>
    );
  }

  const button = (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-describedby={showReason ? reasonId : describedBy}
      className={classes}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : icon ? (
        <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} aria-hidden="true" />
      ) : null}
      {loading && loadingLabel ? loadingLabel : children}
      {showReason ? (
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      ) : null}
    </button>
  );

  if (!showReason) return button;

  return (
    <Tooltip content={disabledReason}>
      <span tabIndex={0} className={cx("inline-flex rounded-3xl", block && "w-full")}>
        {button}
      </span>
    </Tooltip>
  );
}
