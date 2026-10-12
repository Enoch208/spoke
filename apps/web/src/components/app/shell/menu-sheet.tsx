"use client";

import { Dialog } from "@/components/ui/dialog";
import { shellCopy } from "@/lib/copy";
import { useSessionStore } from "@/lib/stores/session";
import { accountNav, navForArea } from "../nav";
import { NavLink } from "./nav-link";
import type { ShellArea } from "./use-area";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function MenuSheet({
  area,
  open,
  onOpenChange,
}: {
  area: ShellArea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isOperator = useSessionStore((state) => state.isOperator);
  const close = () => {
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={shellCopy.menu}>
      <div className="flex flex-col gap-5">
        <WorkspaceSwitcher area={area} />
        <nav aria-label={shellCopy.areas[area]}>
          <ul className="flex flex-col gap-0.5">
            {navForArea(area).map((item) => (
              <li key={item.id}>
                <NavLink item={item} onNavigate={close} />
              </li>
            ))}
          </ul>
        </nav>
        {isOperator && area !== "ops" ? (
          <nav aria-label={shellCopy.areas.ops}>
            <ul className="flex flex-col gap-0.5">
              {navForArea("ops")
                .slice(0, 1)
                .map((item) => (
                  <li key={item.id}>
                    <NavLink item={{ ...item, label: shellCopy.opsConsole }} onNavigate={close} />
                  </li>
                ))}
            </ul>
          </nav>
        ) : null}
        <nav aria-label={shellCopy.areas.account} className="border-hairline border-t pt-4">
          <ul className="flex flex-col gap-0.5">
            {accountNav.map((item) => (
              <li key={item.id}>
                <NavLink item={item} onNavigate={close} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Dialog>
  );
}
