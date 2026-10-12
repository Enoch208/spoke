import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group text-ink relative inline-flex h-10 items-center gap-1 rounded-3xl py-1.5 pr-3 pl-1 font-medium"
    >
      <span
        aria-hidden="true"
        className="bg-ink ease-spring absolute top-1 bottom-1 left-1 w-8 rounded-full transition-[width] duration-[423ms] group-hover:w-[calc(100%-8px)] group-focus-visible:w-[calc(100%-8px)]"
      />
      <span className="text-soft relative flex size-8 items-center justify-center">
        <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="group-hover:text-soft group-focus-visible:text-soft relative pl-0.5">
        {children}
      </span>
    </Link>
  );
}
