import { CheckmarkBadge01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AppFrame } from "./app-frame";
import { exampleToken } from "./example-data";

const stats = [
  { label: "Settled sales", value: "2" },
  { label: "Merchants", value: "2" },
  { label: "Settled commission", value: `7.50 ${exampleToken}` },
  { label: "Refunded", value: "0" },
] as const;

const receipts = [
  { product: "Shader Starter Pack", merchant: "Lumen Labs", amount: "+5.00", settled: true },
  { product: "Notion Ops Templates", merchant: "Northwind Kits", amount: "+2.50", settled: true },
  { product: "Mobile UI Kit", merchant: "Pixel Foundry", amount: "+1.20", settled: false },
] as const;

export function ReputationScreen() {
  return (
    <AppFrame active="reputation" title="Distributor profile">
      <div className="flex h-[480px] flex-col gap-3">
        <div className="bg-surface border-hairline flex items-center gap-4 rounded-xl border p-4">
          <span className="bg-lilac text-ink flex size-12 items-center justify-center rounded-xl text-[18px] font-semibold">
            D
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Dana</p>
            <p className="text-subtle text-[11px]">Shares dev tools and design templates</p>
          </div>
          <span className="bg-pill text-ink rounded-full px-3 py-1.5 text-[11px] font-medium">
            Invite to a campaign
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface border-hairline rounded-xl border p-4">
              <p className="text-subtle text-[10px]">{stat.label}</p>
              <p className="mt-1.5 font-mono text-[18px]">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-surface border-hairline flex-1 rounded-xl border p-4">
          <p className="text-[12px] font-medium">Receipts behind this profile</p>
          <ul className="mt-3 flex flex-col">
            {receipts.map((receipt) => (
              <li
                key={receipt.product}
                className="border-hairline flex items-center justify-between border-t py-2.5 text-[11px]"
              >
                <span>
                  {receipt.product}
                  <span className="text-subtle block text-[10px]">{receipt.merchant}</span>
                </span>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${receipt.settled ? "bg-lime-soft text-lime-deep" : "bg-amber-soft text-amber-deep"}`}
                >
                  <HugeiconsIcon
                    icon={receipt.settled ? CheckmarkBadge01Icon : Clock01Icon}
                    size={12}
                    aria-hidden="true"
                  />
                  {receipt.settled ? "Finalized" : "Pending, not counted yet"}
                </span>
                <span className="w-14 text-right font-mono">{receipt.amount}</span>
              </li>
            ))}
          </ul>
          <p className="text-subtle mt-3 text-[10px]">
            Only finalized and non-refunded sales count toward public performance.
          </p>
        </div>
      </div>
    </AppFrame>
  );
}
