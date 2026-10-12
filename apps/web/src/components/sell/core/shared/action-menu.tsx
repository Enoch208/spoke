"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { useState, type ReactElement } from "react";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/icon-button";
import { Popover } from "@/components/ui/popover";

export type MenuItem = {
  key: string;
  label: string;
  icon?: IconSvgElement;
  danger?: boolean;
  disabled?: boolean;
  external?: boolean;
} & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

const itemClass = (item: MenuItem) =>
  cx(
    "font-ui hover:bg-pill flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-base transition-colors duration-[423ms] ease-spring disabled:pointer-events-none disabled:opacity-45",
    item.danger ? "text-pink-ink" : "text-ink",
  );

export function ActionMenu({
  label,
  items,
  trigger,
  showTitle = false,
}: {
  label: string;
  items: readonly MenuItem[];
  trigger?: ReactElement;
  showTitle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title={label}
      showTitle={showTitle}
      width={280}
      trigger={trigger ?? <IconButton icon={MoreHorizontalIcon} label={label} size="sm" />}
    >
      <ul className="flex flex-col p-1.5">
        {items.map((item) => {
          const content = (
            <>
              {item.icon ? (
                <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} aria-hidden="true" />
              ) : null}
              {item.label}
            </>
          );
          return (
            <li key={item.key}>
              {item.href !== undefined ? (
                <Link
                  href={item.href}
                  className={itemClass(item)}
                  {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={item.disabled}
                  className={itemClass(item)}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}
