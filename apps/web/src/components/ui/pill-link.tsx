import Link from "next/link";
import type { ReactNode } from "react";

const sizes = {
  md: "h-10 px-6",
  lg: "h-[46px] px-6",
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
      className={`bg-pill text-ink ease-spring inline-flex items-center rounded-3xl border border-transparent font-medium transition-[background-color,border-color] duration-[423ms] hover:border-ink hover:bg-transparent focus-visible:border-ink focus-visible:bg-transparent ${sizes[size]}`}
    >
      {children}
    </Link>
  );
}
