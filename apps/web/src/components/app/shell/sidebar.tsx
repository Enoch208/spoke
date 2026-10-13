"use client";

import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/icon-button";
import { shellCopy } from "@/lib/copy";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { accountNav } from "../nav";
import { AccountChip } from "./account-chip";
import { NavLink } from "./nav-link";
import { SidebarGroup } from "./sidebar-group";
import { sidebarGroupsFor } from "./sidebar-groups";
import type { ShellArea } from "./use-area";
import { workspaceHome } from "./workspace-switcher";

const bottomIds = new Set(["settings", "help"]);

export function Sidebar({ area }: { area: ShellArea }) {
  const collapsed = useWorkspaceStore((state) => state.sidebarCollapsed);
  const toggle = useWorkspaceStore((state) => state.toggleSidebar);
  const bottom = accountNav.filter((item) => bottomIds.has(item.id));
  return (
    <aside
      className={cx(
        "border-hairline bg-section sticky top-0 hidden h-dvh min-h-0 shrink-0 flex-col border-r lg:flex",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div
        className={cx(
          "flex shrink-0 items-center justify-between gap-3 px-5 py-5",
          collapsed && "flex-col px-3 py-4",
        )}
      >
        <Link
          href={area === "ops" ? workspaceHome("earn") : workspaceHome(area)}
          className="inline-flex items-center gap-2"
        >
          <BrandMark height={24} />
          {collapsed ? (
            <span className="sr-only">Spoke</span>
          ) : (
            <span className="font-display text-[22px] leading-none font-extrabold tracking-[-0.03em]">
              Spoke
            </span>
          )}
        </Link>
        <IconButton
          icon={SidebarLeftIcon}
          label={collapsed ? shellCopy.expandSidebar : shellCopy.collapseSidebar}
          title={collapsed ? shellCopy.expandSidebar : shellCopy.collapseSidebar}
          size="sm"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="desktop-navigation"
          className={cx(collapsed && "rotate-180")}
        />
      </div>
      <nav
        id="desktop-navigation"
        aria-label={shellCopy.mainNav}
        data-lenis-prevent
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 pb-5 [scrollbar-width:thin]"
      >
        {sidebarGroupsFor(area).map((group) => (
          <SidebarGroup key={group.id} group={group} compact={collapsed} />
        ))}
      </nav>
      <div className="border-hairline flex shrink-0 flex-col gap-3 border-t px-3 py-4">
        <ul className="flex flex-col gap-1">
          {bottom.map((item) => (
            <li key={item.id}>
              <NavLink item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
        <AccountChip compact={collapsed} />
      </div>
    </aside>
  );
}
