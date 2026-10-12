"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { FitToWidth } from "@/components/ui/fit-to-width";
import { sections } from "@/lib/routes";
import { PanelBackdrop } from "./panel-backdrop";
import { showcaseTabs as tabs } from "./showcase-tabs";

type Indicator = { left: number; width: number } | null;

export function Showcase() {
  const [active, setActive] = useState(0);
  const [indicator, setIndicator] = useState<Indicator>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const measure = () => {
      const button = buttons.current[active];
      if (button) setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  const select = (index: number) => {
    setActive(index);
    buttons.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = (active + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    select(next);
    buttons.current[next]?.focus();
  };

  return (
    <section id={sections.product} data-reveal className="scroll-mt-24 px-5 xl:px-0">
      <div
        role="tablist"
        aria-label="Spoke product areas"
        onKeyDown={onKeyDown}
        className="no-scrollbar relative mx-auto flex max-w-max gap-5 overflow-x-auto lg:mt-5"
      >
        {indicator && (
          <span
            aria-hidden="true"
            className="bg-pill ease-spring absolute top-0 left-0 h-10 rounded-3xl transition-[transform,width] duration-[423ms]"
            style={{ width: indicator.width, transform: `translateX(${String(indicator.left)}px)` }}
          />
        )}
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            id={`showcase-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-controls="showcase-panel"
            tabIndex={index === active ? 0 : -1}
            onClick={() => {
              select(index);
            }}
            className={`relative flex h-10 shrink-0 items-center gap-1 rounded-3xl py-1 pr-6 pl-3 text-sm ${index === active ? "font-medium" : ""} ${index === active && !indicator ? "bg-pill" : ""}`}
          >
            <span className="flex size-8 items-center justify-center">
              <HugeiconsIcon icon={tab.icon} size={22} aria-hidden="true" />
            </span>
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id="showcase-panel"
        role="tabpanel"
        aria-labelledby={`showcase-tab-${tabs[active]?.key ?? "marketplace"}`}
        className="mx-auto mt-5 max-w-[1200px] overflow-hidden rounded-3xl"
      >
        <FitToWidth width={1200} height={668}>
          <PanelBackdrop tone="pink" />
          {tabs.map((tab, index) => (
            <div
              key={tab.key}
              aria-hidden={index !== active}
              className={`ease-spring absolute top-[81px] left-[60px] h-[634px] w-[1080px] transition-opacity duration-[423ms] ${index === active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <tab.Screen />
            </div>
          ))}
        </FitToWidth>
      </div>
    </section>
  );
}
