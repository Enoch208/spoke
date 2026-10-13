"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { growthCopy } from "./copy";

export function ConfirmPopover({
  trigger,
  title,
  body,
  confirmLabel,
  cancelLabel = growthCopy.keep,
  danger = false,
  onConfirm,
  children,
}: {
  trigger: ReactElement;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} title={title} trigger={trigger} width={320}>
      <div className="font-ui space-y-3 p-4">
        <p className="text-ink text-sm font-medium">{title}</p>
        {body ? <p className="text-body text-sm">{body}</p> : null}
        {children}
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOpen(false);
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Popover>
  );
}
