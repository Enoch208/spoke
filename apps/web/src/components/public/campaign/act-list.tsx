"use client";

import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/spinner";
import { BuyButton, LinkButton } from "./buttons";
import type { CampaignAct } from "./use-campaign-actions";

function Act({
  act,
  campaignId,
  code,
}: {
  act: CampaignAct;
  campaignId: string;
  code: string | null;
}) {
  if (act.kind === "buy")
    return (
      <BuyButton campaignId={campaignId} nodeId={act.nodeId} code={code} variant={act.variant}>
        {act.label}
      </BuyButton>
    );
  if (act.kind === "href")
    return (
      <LinkButton href={act.href} variant={act.variant}>
        {act.label}
      </LinkButton>
    );
  return (
    <Button block variant={act.variant} disabled={act.disabled ?? false} onClick={act.onClick}>
      {act.busy ? <Spinner /> : null}
      {act.label}
    </Button>
  );
}

export function ActList({
  acts,
  campaignId,
  code,
  layout,
}: {
  acts: readonly CampaignAct[];
  campaignId: string;
  code: string | null;
  layout: "stack" | "bar";
}) {
  const shown = layout === "bar" ? acts.slice(0, 2) : acts;
  if (shown.length === 0) return null;
  return (
    <div
      className={cx(
        "flex gap-2",
        layout === "stack" ? "flex-col" : "max-[359px]:flex-col [&>*]:min-w-0 [&>*]:flex-1",
      )}
    >
      {shown.map((act) => (
        <Act key={act.id} act={act} campaignId={campaignId} code={code} />
      ))}
    </div>
  );
}
