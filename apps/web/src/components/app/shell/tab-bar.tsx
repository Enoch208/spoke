"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/cx";
import { shellCopy } from "@/lib/copy";
import { allNavItems, isActiveHref, phoneTabIds } from "../nav";
import type { ShellArea } from "./use-area";

export function TabBar({ area }: { area: ShellArea | "discover" }) {
  const pathname = usePathname();
  const ids: readonly string[] = phoneTabIds[area];
  const workspaceLabels: Readonly<Record<string, string>> =
    area === "discover"
      ? { "earn-home": shellCopy.workspaces.earn, "sell-overview": shellCopy.workspaces.sell }
      : {};
  const tabs = ids.flatMap((id) =>
    allNavItems
      .filter((item) => item.id === id)
      .map((item) => ({ ...item, label: workspaceLabels[item.id] ?? item.label })),
  );
  return (
    <nav
      aria-label={shellCopy.areas[area]}
      className="border-hairline bg-page/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-[30px] lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                {...(active ? { "aria-current": "page" as const } : {})}
                className={cx(
                  "font-ui flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active ? "text-ink" : "text-subtle hover:text-ink",
                )}
              >
                <HugeiconsIcon icon={item.icon} size={22} strokeWidth={1.8} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
