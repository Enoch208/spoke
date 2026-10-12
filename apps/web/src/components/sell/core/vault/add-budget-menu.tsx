"use client";

import { MoneyAdd01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { vaultCopy as copy } from "../copy/vault";
import { ActionMenu } from "../shared/action-menu";
import { canTopUp } from "../shared/campaign-rules";

export function AddBudgetMenu() {
  const mine = useClientQuery("campaigns.mine", {});
  const items = (mine.data?.items ?? [])
    .filter((row) => row.campaignId !== null && canTopUp(merchantRowStateKey(row)))
    .map((row) => ({
      key: row.campaignId ?? row.productTitle,
      label: row.productTitle,
      onSelect: () => {
        if (row.campaignId) useUiStore.getState().open("M-23", { campaignId: row.campaignId });
      },
    }));
  const trigger = (
    <Button icon={MoneyAdd01Icon} disabled={items.length === 0} disabledReason={copy.noTopUp}>
      {copy.addBudget}
    </Button>
  );
  if (items.length === 0) return trigger;
  return <ActionMenu label={copy.chooseCampaign} items={items} trigger={trigger} showTitle />;
}
