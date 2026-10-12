import { AppFrame } from "./app-frame";
import { exampleSplit, exampleToken } from "./example-data";
import { NetworkGraph } from "./network-graph";

const legend = [
  { label: "Paid path", swatch: "bg-lime border-olive" },
  { label: "Buyer", swatch: "bg-pink border-pink-deep" },
  { label: "Branch, no payout", swatch: "bg-surface border-line" },
] as const;

export function NetworkScreen() {
  return (
    <AppFrame
      active="network"
      title="Network explorer"
      actions={<span className="text-subtle text-[11px]">Shader Starter Pack · Lumen Labs</span>}
    >
      <div className="flex h-[480px] gap-3">
        <div className="bg-surface border-hairline flex flex-1 flex-col rounded-xl border p-4">
          <div className="flex gap-4">
            {legend.map((item) => (
              <span key={item.label} className="text-muted flex items-center gap-1.5 text-[10px]">
                <span className={`size-2.5 rounded-full border ${item.swatch}`} />
                {item.label}
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            <NetworkGraph />
          </div>
        </div>
        <div className="bg-surface border-hairline w-[250px] shrink-0 rounded-xl border p-4">
          <p className="text-subtle text-[10px] font-medium tracking-wide uppercase">Sale 1042</p>
          <p className="mt-1 text-[13px] font-medium">Bought through Dana&apos;s link</p>
          <div className="bg-soft mt-3 grid grid-cols-2 gap-2 rounded-lg p-2.5 text-[10px]">
            <span className="text-subtle">
              Price
              <span className="text-ink block font-mono text-[12px]">100.00 {exampleToken}</span>
            </span>
            <span className="text-subtle">
              Reward 10%
              <span className="text-ink block font-mono text-[12px]">10.00 {exampleToken}</span>
            </span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {exampleSplit.map((row) => (
              <li key={row.name} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2">
                  <span className="bg-lime text-olive flex size-6 items-center justify-center rounded-full text-[9px] font-semibold">
                    {row.name.slice(0, 1)}
                  </span>
                  <span>
                    {row.name}
                    <span className="text-subtle block text-[9px]">{row.role}</span>
                  </span>
                </span>
                <span className="text-right font-mono">
                  {row.amount}
                  <span className="text-subtle block text-[9px]">{row.weight}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="bg-amber-soft text-amber-deep mt-4 rounded-lg px-2.5 py-2 text-[10px] font-medium">
            Pending · rewards reserved, claimable after the hold
          </p>
          <p className="text-subtle mt-2 text-[10px]">
            Fay&apos;s branch is in the graph but not on this sale&apos;s path.
          </p>
        </div>
      </div>
    </AppFrame>
  );
}
