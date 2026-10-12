"use client";

import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/icon-button";
import { shellCopy } from "@/lib/copy";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { accountNav, discoverNav, navForArea, type NavItem } from "../nav";
import { AccountChip } from "./account-chip";
import { NavLink } from "./nav-link";
import type { ShellArea } from "./use-area";
import { workspaceHome } from "./workspace-switcher";

const bottomIds = new Set(["settings", "help"]);

function NavSection({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: readonly NavItem[];
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? (
        <span aria-hidden="true" className="bg-hairline mx-3 my-2 h-px" />
      ) : (
        <span className="text-faint px-3 pt-3 pb-1.5 text-xs font-medium">{label}</span>
      )}
      <ul className="flex flex-col gap-0.5" aria-label={label}>
        {items.map((item) => (
          <li key={item.id}>
            <NavLink item={item} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({ area }: { area: ShellArea }) {
  const collapsed = useWorkspaceStore((state) => state.sidebarCollapsed);
  const toggle = useWorkspaceStore((state) => state.toggleSidebar);
  const bottom = accountNav.filter((item) => bottomIds.has(item.id));
  return (
    <aside
      className={cx(
        "border-hairline bg-section sticky top-0 hidden h-dvh shrink-0 flex-col border-r lg:flex",
        collapsed ? "w-16" : "w-[248px]",
      )}
    >
      <div className={cx("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
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
      </div>
      <nav
        aria-label={shellCopy.mainNav}
        className="no-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4"
      >
        <NavSection label={shellCopy.areas.discover} items={discoverNav} collapsed={collapsed} />
        <NavSection label={shellCopy.areas[area]} items={navForArea(area)} collapsed={collapsed} />
      </nav>
      <div className="border-hairline flex flex-col gap-2 border-t px-3 py-3">
        <ul className="flex flex-col gap-0.5">
          {bottom.map((item) => (
            <li key={item.id}>
              <NavLink item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
        <AccountChip compact={collapsed} />
        <IconButton
          icon={SidebarLeftIcon}
          label={collapsed ? shellCopy.expandSidebar : shellCopy.collapseSidebar}
          size="sm"
          onClick={toggle}
          className={cx(collapsed ? "self-center" : "self-end")}
        />
      </div>
    </aside>
  );
}
