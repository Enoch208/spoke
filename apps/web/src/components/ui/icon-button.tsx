"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

const sizes = {
  sm: { box: "size-8", icon: 16 },
  md: { box: "size-10", icon: 20 },
} as const;

const variants = {
  ghost: "text-ink hover:bg-pill",
  pill: "bg-pill text-ink hover:bg-pill-edge",
  ink: "bg-ink text-page hover:bg-ink/85",
} as const;

export function IconButton({
  icon,
  label,
  size = "md",
  variant = "ghost",
  badge,
  className,
  type = "button",
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  icon: IconSvgElement;
  label: string;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  badge?: ReactNode;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-[423ms] ease-spring disabled:pointer-events-none disabled:opacity-45",
        sizes[size].box,
        variants[variant],
        className,
      )}
      {...rest}
    >
      <HugeiconsIcon icon={icon} size={sizes[size].icon} strokeWidth={1.8} aria-hidden="true" />
      {badge !== undefined ? (
        <span
          aria-hidden="true"
          className="bg-pink-ink text-page absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-sm leading-none"
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
