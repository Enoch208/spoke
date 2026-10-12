"use client";

import { Popover as RadixPopover, Slot } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import { cx } from "./cx";
import { Dialog } from "./dialog";
import { usePhone } from "./use-phone";

const popoverWidths = {
  280: "w-[280px]",
  320: "w-[320px]",
  360: "w-[360px]",
  380: "w-[380px]",
} as const;

export function Popover({
  open,
  onOpenChange,
  trigger,
  title,
  showTitle = false,
  width = 320,
  align = "end",
  side = "bottom",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  title: string;
  showTitle?: boolean;
  width?: keyof typeof popoverWidths;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  children: ReactNode;
}) {
  const phone = usePhone();

  if (phone) {
    return (
      <>
        <Slot.Root
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            onOpenChange(!open);
          }}
        >
          {trigger}
        </Slot.Root>
        <Dialog open={open} onOpenChange={onOpenChange} title={title} bodyClassName="px-2 sm:px-2">
          {children}
        </Dialog>
      </>
    );
  }

  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          aria-label={title}
          align={align}
          side={side}
          sideOffset={8}
          collisionPadding={16}
          className={cx(
            "font-ui bg-surface text-ink shadow-frame data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in z-[60] flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-hairline outline-none",
            popoverWidths[width],
          )}
        >
          {showTitle ? (
            <p className="font-display text-ink text-h4 px-4 pt-4 font-medium">{title}</p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
