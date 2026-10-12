"use client";

import { Tabs as RadixTabs } from "radix-ui";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";

export type TabItem<Value extends string> = {
  value: Value;
  label: ReactNode;
  count?: ReactNode;
  disabled?: boolean;
};

export function Tabs<Value extends string>({
  value,
  onValueChange,
  values,
  className,
  children,
}: {
  value: Value;
  onValueChange: (value: Value) => void;
  values: readonly Value[];
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <RadixTabs.Root
      value={value}
      onValueChange={(next) => {
        const match = values.find((candidate) => candidate === next);
        if (match) onValueChange(match);
      }}
      className={cx("flex flex-col gap-4", className)}
    >
      {children}
    </RadixTabs.Root>
  );
}

type Indicator = { left: number; width: number } | null;

export function TabList<Value extends string>({
  value,
  items,
  label,
  className,
}: {
  value: Value;
  items: readonly TabItem<Value>[];
  label: string;
  className?: string | undefined;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<Indicator>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const active = list.current?.querySelector<HTMLElement>('[data-state="active"]');
      if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [value, items.length]);

  return (
    <RadixTabs.List
      ref={list}
      aria-label={label}
      className={cx("no-scrollbar relative flex max-w-full gap-1 overflow-x-auto", className)}
    >
      {indicator ? (
        <span
          aria-hidden="true"
          className="bg-pill ease-spring absolute top-0 left-0 h-9 rounded-3xl transition-[transform,width] duration-[423ms]"
          style={{ width: indicator.width, transform: `translateX(${String(indicator.left)}px)` }}
        />
      ) : null}
      {items.map((item) => (
        <RadixTabs.Trigger
          key={item.value}
          value={item.value}
          disabled={item.disabled ?? false}
          className={cx(
            "font-ui text-subtle data-[state=active]:text-ink relative flex h-9 shrink-0 items-center gap-1.5 rounded-3xl px-3.5 text-sm font-medium whitespace-nowrap disabled:opacity-45",
            !indicator && "data-[state=active]:bg-pill",
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className="text-subtle font-mono tabular-nums">{item.count}</span>
          ) : null}
        </RadixTabs.Trigger>
      ))}
    </RadixTabs.List>
  );
}

export function TabPanel({
  value,
  className,
  children,
}: {
  value: string;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <RadixTabs.Content value={value} className={cx("outline-none", className)}>
      {children}
    </RadixTabs.Content>
  );
}
