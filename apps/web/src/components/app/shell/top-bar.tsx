"use client";

import { Add01Icon, Menu01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ModeBadge } from "@/components/ui/mode-badge";
import { shellCopy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useModeStore } from "@/lib/stores/mode";
import { useUiStore } from "@/lib/stores/ui";
import { NotificationsBell } from "../notifications-bell";
import { AccountChip } from "./account-chip";
import { MenuSheet } from "./menu-sheet";
import { TxIndicator } from "./tx-indicator";
import type { ShellArea } from "./use-area";
import { WorkspaceSwitcher, workspaceHome } from "./workspace-switcher";

function CreateButton({ area }: { area: ShellArea }) {
  if (area === "ops") return null;
  return (
    <Button asChild size="md">
      <Link href={area === "earn" ? routes.earn.opportunities : routes.sell.newCampaign}>
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={2} aria-hidden="true" />
        {shellCopy.create[area]}
      </Link>
    </Button>
  );
}

export function TopBar({ area }: { area: ShellArea }) {
  const mode = useModeStore((state) => state.mode);
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="border-hairline bg-page/85 sticky top-0 z-30 border-b backdrop-blur-[30px]">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <IconButton
            icon={Menu01Icon}
            label={shellCopy.menu}
            onClick={() => {
              setMenuOpen(true);
            }}
          />
          <Link href={area === "ops" ? workspaceHome("earn") : workspaceHome(area)}>
            <BrandMark height={24} />
            <span className="sr-only">Spoke</span>
          </Link>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <WorkspaceSwitcher area={area} />
          <button
            type="button"
            onClick={() => {
              setPaletteOpen(true);
            }}
            aria-label={shellCopy.openSearch}
            className="font-ui bg-pill text-muted hover:text-ink flex h-10 w-[260px] items-center gap-2 rounded-3xl px-4 text-sm"
          >
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} aria-hidden="true" />
            <span className="flex-1 text-left">{shellCopy.search}</span>
            <kbd className="font-mono text-sm">{shellCopy.searchShortcut}</kbd>
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ModeBadge mode={mode} className="hidden sm:inline-flex" />
          <div className="hidden lg:block">
            <TxIndicator />
          </div>
          <div className="lg:hidden">
            <TxIndicator compact />
          </div>
          <NotificationsBell />
          <div className="hidden lg:block">
            <CreateButton area={area} />
          </div>
          <div className="lg:hidden">
            <AccountChip compact />
          </div>
        </div>
      </div>
      <MenuSheet area={area} open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
