"use client";

import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/icon-button";
import { shellCopy } from "@/lib/copy";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { accountNav, navForArea } from "../nav";
import { AccountChip } from "./account-chip";
import { NavLink } from "./nav-link";
import type { ShellArea } from "./use-area";
import { workspaceHome } from "./workspace-switcher";

const bottomIds = new Set(["settings", "help"]);

export function Sidebar({ area }: { area: ShellArea }) {
  const collapsed = useWorkspaceStore((state) => state.sidebarCollapsed);
  const toggle = useWorkspaceStore((state) => state.toggleSidebar);
  const items = navForArea(area);
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
        aria-label={shellCopy.areas[area]}
        className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4"
      >
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <NavLink item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-hairline flex flex-col gap-0.5 border-t px-3 py-3">
        {bottom.map((item) => (
          <NavLink key={item.id} item={item} collapsed={collapsed} />
        ))}
        <AccountChip compact={collapsed} />
        <IconButton
          icon={SidebarLeftIcon}
          label={collapsed ? shellCopy.expandSidebar : shellCopy.collapseSidebar}
          size="sm"
          onClick={toggle}
          className={cx("mt-1", collapsed ? "self-center" : "self-end")}
        />
      </div>
    </aside>
  );
}
