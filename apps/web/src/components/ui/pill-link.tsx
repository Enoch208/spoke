import Link from "next/link";
import type { ReactNode } from "react";

const sizes = {
  md: "h-10 px-[23px]",
  lg: "h-[46px] px-[23px]",
} as const;

export function PillLink({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: ReactNode;
  size?: keyof typeof sizes;
}) {
  return (
    <Link
      href={href}
      className={`bg-pill text-ink border-pill-edge hover:border-ink focus-visible:border-ink inline-flex items-center rounded-3xl border font-medium [transition-duration:423ms] [transition-property:background-color,border-color] [transition-timing-function:var(--ease-spring),var(--ease-edge-out)] hover:bg-transparent hover:[transition-timing-function:var(--ease-spring),var(--ease-edge-in)] focus-visible:bg-transparent focus-visible:[transition-timing-function:var(--ease-spring),var(--ease-edge-in)] ${sizes[size]}`}
    >
      {children}
    </Link>
  );
}
