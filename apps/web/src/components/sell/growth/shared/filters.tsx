"use client";

import { FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { growthCopy } from "./copy";

export function FilterRow({
  count,
  lead,
  onClear,
  children,
}: {
  count: number;
  lead?: ReactNode;
  onClear?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden flex-wrap items-end gap-3 lg:flex">
        {lead}
        {children}
        {onClear && count > 0 ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            {growthCopy.clearFilters}
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2 lg:hidden">
        {lead ? <div className="min-w-0 flex-1">{lead}</div> : null}
        <Button
          variant="secondary"
          icon={FilterHorizontalIcon}
          className={lead ? undefined : "w-full"}
          onClick={() => {
            setOpen(true);
          }}
        >
          {growthCopy.filters}
          {count > 0 ? (
            <span className="bg-ink text-page ml-1 inline-flex size-5 items-center justify-center rounded-full font-mono text-xs">
              {count}
            </span>
          ) : null}
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={growthCopy.filters}
        footer={
          <>
            {onClear ? (
              <Button variant="secondary" onClick={onClear}>
                {growthCopy.clearFilters}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              {growthCopy.applyFilters}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 [&>*]:w-full">{children}</div>
      </Dialog>
    </>
  );
}
