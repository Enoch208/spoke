import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group text-ink inline-flex h-10 items-center gap-1 rounded-3xl py-1.5 pr-3 pl-1 font-medium"
    >
      <span className="bg-ink text-soft flex size-8 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5">
        <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="pl-0.5">{children}</span>
    </Link>
  );
}
