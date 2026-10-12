import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Blob } from "@/components/art/blob";
import { Piece } from "@/components/art/piece";
import { PanelBackdrop } from "@/components/landing/panel-backdrop";
import { authCopy } from "@/lib/copy";

export function AuthBrandPanel() {
  return (
    <aside aria-hidden="true" className="hidden p-3 lg:block">
      <div className="relative flex h-full min-h-[640px] flex-col justify-end overflow-hidden rounded-[28px] p-12">
        <PanelBackdrop tone="lilac" />
        <Piece
          id="auth-lime"
          shape="lime"
          className="animate-rock absolute top-[12%] left-[14%] w-[150px] drop-shadow-[0_18px_24px_rgba(140,190,20,0.25)] will-change-transform"
        />
        <Piece
          id="auth-pink"
          shape="pink"
          className="absolute top-[22%] right-[14%] w-[150px] rotate-[14deg] drop-shadow-[0_24px_30px_rgba(240,120,210,0.3)]"
        />
        <Piece
          id="auth-block"
          shape="block"
          tone="lilac"
          className="absolute top-[40%] left-[38%] w-[120px] -rotate-[8deg] drop-shadow-[0_18px_24px_rgba(150,120,240,0.25)]"
        />
        <Blob tone="sky" shape="dot" className="top-[10%] right-[38%] size-8" />
        <Blob tone="lime" shape="diamond" className="top-[52%] right-[22%] size-10" />
        <div className="relative max-w-[460px]">
          <p className="text-body text-sm">{authCopy.panel.eyebrow}</p>
          <p className="font-display text-ink mt-3 text-[44px] leading-[1.05] font-medium tracking-[-0.03em]">
            {authCopy.panel.title}
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {authCopy.panel.points.map((point) => (
              <li key={point} className="font-ui text-ink flex items-start gap-3 text-[15px]">
                <span className="bg-surface/70 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                  <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.2} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
