import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { ArrowLink } from "@/components/ui/arrow-link";
import { PanelBackdrop, type PanelTone } from "./panel-backdrop";

export interface Feature {
  id: string;
  title: string;
  body: string;
  chips: { label: string; icon: IconSvgElement }[];
  cta: { label: string; href: string };
  tone: PanelTone;
  screen: ReactNode;
}

export function FeatureBlock({ feature }: { feature: Feature }) {
  return (
    <article
      id={feature.id}
      className="reveal bg-pill flex scroll-mt-24 flex-col gap-8 rounded-3xl p-6 shadow-[0_-12px_32px_rgba(128,128,128,0.05)] lg:h-[580px] lg:flex-row lg:gap-10 lg:p-10"
    >
      <div className="flex flex-1 flex-col">
        <h3 className="font-display text-[30px] leading-[1.2] font-medium lg:text-h3">
          {feature.title}
        </h3>
        <p className="text-muted mt-5 max-w-[540px] text-pretty">{feature.body}</p>
        <ul className="mt-5 flex flex-wrap gap-2 lg:flex-col lg:items-start">
          {feature.chips.map((chip) => (
            <li
              key={chip.label}
              className="bg-page flex h-10 items-center gap-1 rounded-3xl py-1 pr-6 pl-3"
            >
              <span className="flex size-8 items-center justify-center">
                <HugeiconsIcon icon={chip.icon} size={22} aria-hidden="true" />
              </span>
              {chip.label}
            </li>
          ))}
        </ul>
        <div className="mt-8 lg:mt-auto">
          <ArrowLink href={feature.cta.href}>{feature.cta.label}</ArrowLink>
        </div>
      </div>
      <div className="relative hidden h-[500px] shrink-0 overflow-hidden rounded-[20px] lg:block lg:w-[48%] xl:w-[540px]">
        <PanelBackdrop tone={feature.tone} />
        <div className="absolute top-[59px] left-[52px] h-[634px] w-[1080px]">{feature.screen}</div>
      </div>
    </article>
  );
}
