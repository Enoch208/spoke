"use client";

import { Piece } from "@/components/art/piece";
import { PanelBackdrop } from "@/components/landing/panel-backdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import type { Persona } from "@/lib/stores/mode";
import { demoPageCopy, personaCards } from "./demo-copy";

export function PersonaCard({
  persona,
  current,
  loading,
  onEnter,
}: {
  persona: Persona;
  current: boolean;
  loading: boolean;
  onEnter: () => void;
}) {
  const copy = personaCards[persona];
  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div aria-hidden="true" className="relative aspect-[16/9]">
        <PanelBackdrop tone={copy.tone} />
        <Piece
          id={`persona-${persona}`}
          shape={copy.shape}
          tone={copy.pieceTone}
          className="absolute top-1/2 left-1/2 h-[56%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_18px_24px_rgba(26,26,26,0.12)]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-h4 text-ink font-medium">{copy.title}</h2>
          {current ? <Badge tone="lilac">{demoPageCopy.current}</Badge> : null}
        </div>
        <p className="text-body text-sm">{copy.body}</p>
        <p className="text-subtle text-sm">{copy.tryLine}</p>
        <p className="text-ink mt-auto text-sm font-medium">
          {fill(demoPageCopy.startIn, { place: copy.place })}
        </p>
        <Button
          block
          variant={current ? "secondary" : "primary"}
          loading={loading}
          loadingLabel={demoPageCopy.loading}
          onClick={onEnter}
        >
          {copy.action}
        </Button>
      </div>
    </Card>
  );
}
