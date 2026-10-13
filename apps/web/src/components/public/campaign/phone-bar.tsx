"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui/cx";
import { ActList } from "./act-list";
import type { CampaignAct } from "./use-campaign-actions";

function useActionsOutOfView() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const target = document.querySelector("[data-campaign-actions]");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setHidden(entry ? !entry.isIntersecting : false);
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, []);
  return hidden;
}

export function PhoneActionBar({
  acts,
  campaignId,
  code,
}: {
  acts: readonly CampaignAct[];
  campaignId: string;
  code: string | null;
}) {
  const show = useActionsOutOfView();
  if (acts.length === 0) return null;
  return (
    <>
      <div aria-hidden="true" className="h-20 lg:hidden" />
      <div
        aria-hidden={!show}
        inert={!show}
        className={cx(
          "border-hairline bg-page/90 ease-spring fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t px-4 py-3 backdrop-blur-[30px] transition-[opacity,transform] duration-[423ms] lg:hidden",
          show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <ActList acts={acts} campaignId={campaignId} code={code} layout="bar" />
      </div>
    </>
  );
}
