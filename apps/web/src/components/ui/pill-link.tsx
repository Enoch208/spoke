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
      className={`bg-pill text-ink hover:bg-line inline-flex items-center rounded-3xl font-medium transition-colors duration-200 ${sizes[size]}`}
    >
      {children}
    </Link>
  );
}
