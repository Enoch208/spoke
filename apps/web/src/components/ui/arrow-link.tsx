import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type { ReactNode } from "react";

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group text-ink relative isolate inline-flex h-10 items-center gap-1 rounded-3xl py-1.5 pr-3 pl-1 font-medium"
    >
      <span
        aria-hidden="true"
        className="bg-ink ease-fade absolute inset-0 -z-10 rounded-3xl transition-[clip-path] duration-400 [clip-path:inset(4px_calc(100%_-_36px)_4px_4px_round_16px)] group-hover:[clip-path:inset(0px_0px_0px_0px_round_20px)] group-focus-visible:[clip-path:inset(0px_0px_0px_0px_round_20px)]"
      />
      <span className="text-soft flex size-8 items-center justify-center">
        <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="group-hover:text-soft group-focus-visible:text-soft">{children}</span>
    </Link>
  );
}
