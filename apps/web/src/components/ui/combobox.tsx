"use client";

import { Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Popover as RadixPopover } from "radix-ui";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { moveActive } from "./combobox-nav";
import { cx } from "./cx";
import { controlClass, useField } from "./field";
import { Spinner } from "./spinner";

export type ComboboxOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export function Combobox<Value extends string>({
  query,
  onQueryChange,
  options,
  value,
  onSelect,
  placeholder,
  loading = false,
  emptyText,
  disabled,
  className,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  options: readonly ComboboxOption<Value>[];
  value: Value | null;
  onSelect: (value: Value) => void;
  placeholder?: string;
  loading?: boolean;
  emptyText: ReactNode;
  disabled?: boolean;
  className?: string | undefined;
}) {
  const field = useField();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const activeOption = active >= 0 ? options[active] : undefined;
  const optionId = (index: number) => `${listId}-option-${String(index)}`;

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onSelect(option.value);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive(moveActive(active, event.key === "ArrowDown" ? 1 : -1, options));
      return;
    }
    if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(active);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <div className={cx("relative", className)}>
          <span className="text-subtle pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <input
            ref={input}
            id={field?.controlId}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeOption ? optionId(active) : undefined}
            aria-describedby={field?.describedBy}
            aria-invalid={field?.invalid || undefined}
            value={query}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className={cx(controlClass, "h-10 pr-10 pl-9")}
          />
          {loading ? (
            <span className="text-subtle absolute inset-y-0 right-3 flex items-center">
              <Spinner />
            </span>
          ) : null}
        </div>
      </RadixPopover.Anchor>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
          onInteractOutside={(event) => {
            const target = event.target;
            if (target instanceof Node && input.current?.contains(target)) event.preventDefault();
          }}
          className="font-ui bg-surface shadow-frame data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in z-[60] w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden rounded-xl border border-line"
        >
          <ul id={listId} role="listbox" className="max-h-[min(50vh,320px)] overflow-y-auto p-1">
            {options.length === 0 ? (
              <li role="presentation" className="text-subtle px-3 py-3 text-sm">
                {emptyText}
              </li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  onPointerMove={() => {
                    if (!option.disabled) setActive(index);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(index);
                  }}
                  className={cx(
                    "relative flex min-h-10 cursor-default flex-col justify-center rounded-lg py-2 pr-9 pl-3",
                    index === active && "bg-pill",
                    option.disabled ? "text-faint" : "text-ink",
                  )}
                >
                  <span className="text-base">{option.label}</span>
                  {option.description ? (
                    <span className="text-subtle text-sm">{option.description}</span>
                  ) : null}
                  {option.value === value ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="absolute top-1/2 right-3 -translate-y-1/2"
                    />
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
