"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Dialog as RadixDialog } from "radix-ui";
import { useRef, type ReactNode, type RefObject } from "react";
import { common } from "@/lib/copy";
import { cx } from "./cx";
import { IconButton } from "./icon-button";
import { useSheetDrag } from "./use-sheet-drag";

export type ModalKind = "dialog" | "drawer" | "sheet";

export const modalWidths = {
  400: "sm:w-[400px]",
  440: "sm:w-[440px]",
  480: "sm:w-[480px]",
  520: "sm:w-[520px]",
  560: "sm:w-[560px]",
  640: "sm:w-[640px]",
} as const;

export type ModalWidth = keyof typeof modalWidths;

const positioners = {
  dialog: "items-end justify-center sm:items-center sm:p-6",
  drawer: "items-end justify-end sm:items-stretch",
  sheet: "items-end justify-end sm:items-start sm:p-4",
} as const;

const surfaces = {
  dialog:
    "sm:max-h-[85dvh] sm:rounded-2xl sm:data-[state=open]:animate-dialog-in sm:data-[state=closed]:animate-dialog-out",
  drawer:
    "sm:h-full sm:max-h-none sm:max-w-[90vw] sm:rounded-none sm:border-l sm:border-hairline sm:data-[state=open]:animate-drawer-in sm:data-[state=closed]:animate-drawer-out",
  sheet:
    "sm:max-h-[calc(100dvh-32px)] sm:max-w-[calc(100vw-32px)] sm:rounded-2xl sm:data-[state=open]:animate-drawer-in sm:data-[state=closed]:animate-drawer-out",
} as const;

export type ModalFrameProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  headerStart?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  role?: "dialog" | "alertdialog";
  dismissible?: boolean;
  closeDisabled?: boolean;
  showClose?: boolean;
  modal?: boolean;
  inert?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  bodyClassName?: string;
};

export function ModalFrame({
  kind,
  width,
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  headerStart,
  headerActions,
  footer,
  children,
  role = "dialog",
  dismissible = true,
  closeDisabled = false,
  showClose = true,
  modal = true,
  inert = false,
  initialFocus,
  bodyClassName,
}: ModalFrameProps & { kind: ModalKind; width: ModalWidth }) {
  const surface = useRef<HTMLDivElement>(null);
  const canDismiss = dismissible && !closeDisabled;
  const { handleProps, surfaceStyle } = useSheetDrag({
    surface,
    enabled: canDismiss,
    onDismiss: () => {
      onOpenChange(false);
    },
  });
  const blockIfLocked = (event: Event) => {
    if (!canDismiss) event.preventDefault();
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <RadixDialog.Portal>
        {modal ? (
          <RadixDialog.Overlay
            className={cx(
              "bg-ink/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in fixed inset-0 z-50",
              inert && "invisible",
            )}
          />
        ) : null}
        <div
          className={cx("pointer-events-none fixed inset-0 z-50 flex", positioners[kind])}
          inert={inert}
          aria-hidden={inert || undefined}
        >
          <RadixDialog.Content
            ref={surface}
            role={role}
            {...(subtitle ? {} : { "aria-describedby": undefined })}
            onEscapeKeyDown={blockIfLocked}
            onPointerDownOutside={blockIfLocked}
            onInteractOutside={blockIfLocked}
            onOpenAutoFocus={(event) => {
              if (!initialFocus?.current) return;
              event.preventDefault();
              initialFocus.current.focus();
            }}
            style={surfaceStyle}
            className={cx(
              "font-ui bg-surface text-ink shadow-frame pointer-events-auto flex max-h-[92dvh] w-full flex-col rounded-t-2xl outline-none",
              "max-sm:data-[state=closed]:animate-sheet-out max-sm:data-[state=open]:animate-sheet-in",
              modalWidths[width],
              surfaces[kind],
              inert && "invisible",
            )}
          >
            <div
              {...handleProps}
              aria-hidden="true"
              className="flex shrink-0 touch-none justify-center pt-2 pb-1 sm:hidden"
              title={common.dragToClose}
            >
              <span className="bg-pill-edge h-1 w-10 rounded-full" />
            </div>
            <header className="flex shrink-0 items-start gap-3 px-4 pt-2 pb-4 sm:px-6 sm:pt-6">
              {headerStart}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RadixDialog.Title className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
                    {title}
                  </RadixDialog.Title>
                  {badge}
                </div>
                {subtitle ? (
                  <RadixDialog.Description className="text-subtle text-sm">
                    {subtitle}
                  </RadixDialog.Description>
                ) : null}
              </div>
              {headerActions}
              {showClose && dismissible ? (
                <RadixDialog.Close asChild>
                  <IconButton
                    icon={Cancel01Icon}
                    label={common.close}
                    size="sm"
                    disabled={closeDisabled}
                    className="-mt-1 -mr-1"
                  />
                </RadixDialog.Close>
              ) : null}
            </header>
            <div
              className={cx(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 text-base sm:px-6",
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer ? (
              <footer className="border-hairline flex shrink-0 flex-col-reverse gap-2 border-t px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:pb-4 max-sm:[&>*]:w-full">
                {footer}
              </footer>
            ) : null}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
