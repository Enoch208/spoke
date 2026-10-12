"use client";

import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { usePhone } from "@/components/ui/use-phone";
import { notificationsPopover } from "@/lib/copy";
import { useUiStore, type ToastEntry } from "@/lib/stores/ui";
import { visibleToasts } from "./toaster-logic";
import { useSwipeDismiss } from "./use-swipe-dismiss";
import { useToastTimer } from "./use-toast-timer";

function TimedToast({
  entry,
  count,
  onDismiss,
}: {
  entry: ToastEntry;
  count: number | undefined;
  onDismiss: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const swipe = useSwipeDismiss(onDismiss);
  useToastTimer({
    durationMs: entry.durationMs,
    paused: hovered || focused,
    version: entry.createdAt,
    onExpire: onDismiss,
  });
  return (
    <Toast
      tone={entry.tone}
      status={entry.status}
      message={entry.message}
      action={entry.action}
      secondaryAction={entry.secondaryAction}
      {...(count === undefined ? {} : { count })}
      onDismiss={onDismiss}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
      }}
      style={swipe.style}
      className="touch-pan-y"
      {...swipe.handlers}
    />
  );
}

export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);
  const phone = usePhone();
  const region = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F8") return;
      event.preventDefault();
      region.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const { items, count } = visibleToasts(toasts, phone);

  return (
    <section
      ref={region}
      tabIndex={-1}
      aria-label={notificationsPopover.title}
      className="pointer-events-none fixed inset-x-4 bottom-[calc(16px+var(--app-bottom-inset,0px)+env(safe-area-inset-bottom))] z-[80] flex flex-col gap-2 outline-none sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px]"
    >
      {items.map((entry) => (
        <TimedToast
          key={entry.key}
          entry={entry}
          count={phone ? count : undefined}
          onDismiss={() => {
            dismissToast(entry.key);
          }}
        />
      ))}
    </section>
  );
}
