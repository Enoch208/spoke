"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { routeTo } from "@/lib/routes";
import { campaignsCopy as copy } from "../copy/campaigns";
import { ActionMenu } from "../shared/action-menu";
import { useCampaignActions, type CampaignContext } from "../shared/campaign-actions";

export function CampaignRowActions({
  ctx,
  name,
  block = false,
}: {
  ctx: CampaignContext;
  name: string;
  block?: boolean;
}) {
  const actions = useCampaignActions(ctx);
  const run = actions.primary?.onSelect;
  return (
    <div className="flex items-center justify-end gap-2">
      {run ? (
        <Button size="sm" block={block} onClick={run}>
          {actions.primary?.label}
        </Button>
      ) : (
        <Button asChild size="sm" variant="secondary" block={block}>
          <Link href={routeTo.sellCampaign(ctx.campaignId)}>{copy.open}</Link>
        </Button>
      )}
      <ActionMenu
        label={fill(copy.rowMenu, { name })}
        items={[...actions.money, ...actions.shared, ...(actions.end ? [actions.end] : [])]}
      />
    </div>
  );
}
