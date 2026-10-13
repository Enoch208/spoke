"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, type ReactNode } from "react";
import { Piece, type PieceShape, type PieceTone } from "@/components/art/piece";
import { PanelBackdrop, type PanelTone } from "@/components/landing/panel-backdrop";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/icon-button";
import { FlowProgress } from "./flow-progress";

export type FlowArt = { tone: PanelTone; shape: PieceShape; pieceTone?: PieceTone };

export function FlowFrame({
  id,
  steps,
  current,
  art,
  promise,
  title,
  body,
  chip,
  back,
  backLabel,
  footer,
  children,
}: {
  id: string;
  steps: readonly string[];
  current: number;
  art: FlowArt;
  promise: string;
  title: string;
  body?: ReactNode;
  chip?: ReactNode;
  back?: (() => void) | undefined;
  backLabel: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [id]);
  const rocks = art.shape === "lime";
  return (
    <div className="grid gap-6 pb-36 lg:grid-cols-12 lg:gap-12 lg:pb-0">
      <aside
        aria-hidden="true"
        className="relative h-[120px] overflow-hidden rounded-3xl lg:col-span-5 lg:h-auto lg:min-h-[600px] lg:rounded-[28px]"
      >
        <PanelBackdrop tone={art.tone} />
        <Piece
          id={`flow-${art.shape}`}
          shape={art.shape}
          tone={art.pieceTone ?? art.shape}
          className={cx(
            "absolute top-1/2 right-8 w-[92px] -translate-y-1/2 drop-shadow-[0_18px_24px_rgba(26,26,26,0.14)] lg:top-[22%] lg:right-auto lg:left-[18%] lg:w-[190px] lg:translate-y-0",
            rocks && "animate-rock will-change-transform",
          )}
        />
        <p className="font-display text-ink text-h4 absolute right-10 bottom-10 left-10 hidden max-w-[380px] font-medium tracking-[-0.01em] lg:block">
          {promise}
        </p>
      </aside>
      <section className="min-w-0 lg:col-span-7">
        <FlowProgress steps={steps} current={current} />
        <div className="mt-8 max-w-[520px] lg:mt-16">
          {back ? (
            <IconButton
              icon={ArrowLeft01Icon}
              label={backLabel}
              variant="pill"
              size="sm"
              onClick={back}
              className="mb-5"
            />
          ) : null}
          {chip ? <div className="mb-3 flex flex-wrap gap-2">{chip}</div> : null}
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-ink text-h4 lg:text-h3 font-medium tracking-[-0.02em] outline-none"
          >
            {title}
          </h1>
          {body ? <div className="text-body mt-3 text-base">{body}</div> : null}
          {children ? <div className="mt-6 flex flex-col gap-4">{children}</div> : null}
          {footer ? (
            <div className="border-hairline bg-page/95 fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-[30px] sm:px-6 lg:static lg:z-auto lg:mt-8 lg:flex-row-reverse lg:items-center lg:justify-end lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none max-lg:[&>*]:w-full">
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
