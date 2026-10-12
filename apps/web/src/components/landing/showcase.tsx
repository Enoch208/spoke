"use client";

import {
  HierarchyIcon,
  SlidersHorizontalIcon,
  SourceCodeIcon,
  Store01Icon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type KeyboardEvent } from "react";
import { FitToWidth } from "@/components/ui/fit-to-width";
import { sections } from "@/lib/routes";
import { PanelBackdrop } from "./panel-backdrop";
import { DevelopersScreen } from "./screens/developers-screen";
import { MarketplaceScreen } from "./screens/marketplace-screen";
import { NetworkScreen } from "./screens/network-screen";
import { ReputationScreen } from "./screens/reputation-screen";
import { StudioScreen } from "./screens/studio-screen";

const tabs = [
  { key: "marketplace", label: "Marketplace", icon: Store01Icon, Screen: MarketplaceScreen },
  { key: "network", label: "Network Explorer", icon: HierarchyIcon, Screen: NetworkScreen },
  { key: "studio", label: "Commission Studio", icon: SlidersHorizontalIcon, Screen: StudioScreen },
  { key: "reputation", label: "Reputation", icon: UserStar01Icon, Screen: ReputationScreen },
  { key: "developers", label: "Developers", icon: SourceCodeIcon, Screen: DevelopersScreen },
] as const;

export function Showcase() {
  const [active, setActive] = useState(0);
  const current = tabs[active] ?? tabs[0];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = (active + step + tabs.length) % tabs.length;
    setActive(next);
    document.getElementById(`showcase-tab-${tabs[next]?.key ?? ""}`)?.focus();
  };

  return (
    <section id={sections.product} className="scroll-mt-24 px-5 xl:px-0">
      <div
        role="tablist"
        aria-label="Spoke product areas"
        onKeyDown={onKeyDown}
        className="no-scrollbar mx-auto flex max-w-max gap-5 overflow-x-auto lg:mt-5"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            id={`showcase-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-controls="showcase-panel"
            tabIndex={index === active ? 0 : -1}
            onClick={() => {
              setActive(index);
            }}
            className={`flex h-10 shrink-0 items-center gap-1 rounded-3xl py-1 pr-6 pl-3 text-sm transition-colors duration-200 ${index === active ? "bg-pill font-medium" : "hover:bg-pill/60"}`}
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
        aria-labelledby={`showcase-tab-${current.key}`}
        className="mx-auto mt-5 max-w-[1200px] overflow-hidden rounded-3xl"
      >
        <FitToWidth width={1200} height={668}>
          <PanelBackdrop tone="pink" />
          <div
            key={current.key}
            className="animate-fade-in absolute top-[81px] left-[60px] h-[634px] w-[1080px]"
          >
            <current.Screen />
          </div>
        </FitToWidth>
      </div>
    </section>
  );
}
