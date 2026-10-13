"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { composerCopy } from "./copy";

export function StepFooter({
  onBack,
  primary,
  note,
}: {
  onBack: (() => void) | null;
  primary: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="border-hairline bg-page/90 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 border-t px-4 py-3 backdrop-blur-[30px] lg:bottom-0 lg:mx-0 lg:rounded-2xl lg:border lg:px-4">
      {note ? <div className="mb-3">{note}</div> : null}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button variant="secondary" icon={ArrowLeft01Icon} onClick={onBack}>
            {composerCopy.footer.back}
          </Button>
        ) : (
          <span />
        )}
        {primary}
      </div>
    </div>
  );
}
