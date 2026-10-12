"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/components/ui/cx";
import { featureChipCopy } from "@/lib/copy";
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
        "font-ui flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium",
        "[transition-duration:423ms] [transition-property:background-color,color] [transition-timing-function:var(--ease-spring)]",
        active ? "bg-ink text-page" : "text-ink hover:bg-pill",
        collapsed && "justify-center px-0",
      )}
    >
      <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} aria-hidden="true" />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="truncate">{item.label}</span>
      )}
      {demoOnly && !collapsed ? (
        <Badge tone="lilac" className="ml-auto">
          {featureChipCopy["demo-only"].label}
        </Badge>
      ) : null}
    </Link>
  );
}
