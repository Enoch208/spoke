"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Collapsible } from "radix-ui";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/cx";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { isActiveHref } from "../nav";
import { NavLink } from "./nav-link";
import type { SidebarGroup as Group } from "./sidebar-groups";

export function SidebarGroup({
  group,
  compact = false,
  onNavigate,
}: {
  group: Group;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const closed = useWorkspaceStore((state) => state.sidebarGroupsClosed[group.id] ?? false);
  const setClosed = useWorkspaceStore((state) => state.setSidebarGroupClosed);
  const active = group.items.some((item) => isActiveHref(pathname, item.href));
  useEffect(() => {
    if (active) setClosed(group.id, false);
  }, [active, pathname, group.id, setClosed]);
  return (
    <Collapsible.Root
      open={compact || !closed}
      onOpenChange={(open) => {
        setClosed(group.id, !open);
      }}
      className="min-w-0"
    >
      {compact ? (
        <div aria-hidden="true" className="bg-hairline mx-2 mb-3 h-px" />
      ) : (
        <Collapsible.Trigger
          className={cx(
            "hover:bg-pill mb-1 flex h-8 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
            active ? "text-ink" : "text-subtle",
          )}
        >
          <span>{group.label}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={14}
            strokeWidth={1.8}
            aria-hidden="true"
            className={cx("shrink-0", closed && "-rotate-90")}
          />
        </Collapsible.Trigger>
      )}
      <Collapsible.Content>
        <ul aria-label={group.label} className="flex min-w-0 flex-col gap-1">
          {group.items.map((item) => (
            <li key={item.id} className="min-w-0">
              <NavLink item={item} collapsed={compact} {...(onNavigate ? { onNavigate } : {})} />
            </li>
          ))}
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
