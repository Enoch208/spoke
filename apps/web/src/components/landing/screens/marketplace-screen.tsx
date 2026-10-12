import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AppFrame } from "./app-frame";
import { exampleCampaigns, exampleToken } from "./example-data";

const filters = [
  "All campaigns",
  "Dev tools",
  "Templates",
  "Research",
  "Design",
  "Courses",
] as const;

export function MarketplaceScreen() {
  return (
    <AppFrame
      active="marketplace"
      title="Explore campaigns"
      actions={
        <span className="border-line bg-surface text-subtle flex h-8 w-56 items-center gap-2 rounded-full border px-3 text-[11px]">
          <HugeiconsIcon icon={Search01Icon} size={13} aria-hidden="true" />
          Search products or merchants
        </span>
      }
    >
      <div className="flex gap-2">
        {filters.map((filter, index) => (
          <span
            key={filter}
            className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${index === 0 ? "bg-ink text-soft" : "bg-surface border-line text-muted border"}`}
          >
            {filter}
          </span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {exampleCampaigns.map((campaign) => (
          <div key={campaign.product} className="bg-surface border-hairline rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium">{campaign.product}</p>
                <p className="text-subtle mt-0.5 text-[11px]">{campaign.merchant}</p>
              </div>
              <span className="bg-lime-soft text-lime-deep rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {campaign.rate} reward
              </span>
            </div>
            <div className="text-muted mt-4 grid grid-cols-3 gap-2 text-[10px]">
              <span>
                <span className="text-ink block font-mono text-[12px]">{campaign.price}</span>
                {exampleToken}
              </span>
              <span>
                <span className="text-ink block text-[12px] font-medium">
                  {campaign.levels} levels
                </span>
                paid per sale
              </span>
              <span>
                <span className="text-ink block text-[12px] font-medium">{campaign.hold}</span>
                hold
              </span>
            </div>
            <div className="mt-4">
              <div className="text-subtle flex justify-between text-[10px]">
                <span>Reward budget left</span>
                <span className="font-mono">{campaign.funded}%</span>
              </div>
              <div className="bg-pill mt-1.5 h-1.5 rounded-full">
                <div
                  className="bg-lime h-full rounded-full"
                  style={{ width: `${String(campaign.funded)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}
