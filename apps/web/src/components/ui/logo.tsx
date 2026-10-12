import Link from "next/link";
import { routes } from "@/lib/routes";
import { BrandMark } from "./brand-mark";

export function Logo({ priority = false }: { priority?: boolean }) {
  return (
    <Link href={routes.home} aria-label="Spoke home" className="inline-flex items-center gap-2">
      <BrandMark height={28} priority={priority} />
      <span className="font-display text-[26px] leading-[26px] font-extrabold tracking-[-0.03em]">
        Spoke
      </span>
    </Link>
  );
}
