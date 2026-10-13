"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/cx";
import { featureChipCopy, shellCopy } from "@/lib/copy";
import { featureStatus } from "@/lib/features";
import { useModeStore } from "@/lib/stores/mode";
import { isActiveHref, type NavItem } from "../nav";

export function NavLink({
  item,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const mode = useModeStore((state) => state.mode);
  const active = isActiveHref(pathname, item.href);
  const demoOnly =
    mode === "live" && item.feature !== null && featureStatus(item.feature) === "demo-only";
  return (
    <Link
      href={item.href}
      {...(active ? { "aria-current": "page" as const } : {})}
      {...(collapsed ? { title: item.label } : {})}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      className={cx(
        "font-ui flex min-h-11 min-w-0 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium lg:min-h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "[transition-duration:423ms] [transition-property:background-color,color] [transition-timing-function:var(--ease-spring)]",
        active ? "bg-ink text-page" : "text-ink hover:bg-pill",
        collapsed && "justify-center px-0",
      )}
    >
      <HugeiconsIcon
        icon={item.icon}
        size={20}
        strokeWidth={1.8}
        aria-hidden="true"
        className="shrink-0"
      />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      )}
      {demoOnly && !collapsed ? (
        <span
          title={featureChipCopy["demo-only"].label}
          className={cx(
            "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium",
            active ? "bg-page/15 text-page" : "bg-lilac-soft text-ink",
          )}
        >
          {shellCopy.demoTag}
        </span>
      ) : null}
    </Link>
  );
}
