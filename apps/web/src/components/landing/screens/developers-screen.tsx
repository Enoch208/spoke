import { AppFrame } from "./app-frame";

const response = `{
  "chainId": 10143,
  "saleId": "1042",
  "trustMode": "NATIVE_ONCHAIN",
  "state": "FINALIZED",
  "rewardTotalBaseUnits": "10000000",
  "allocationsNearestFirst": [
    { "level": 1, "amountBaseUnits": "5000000" },
    { "level": 2, "amountBaseUnits": "2500000" },
    { "level": 3, "amountBaseUnits": "1500000" },
    { "level": 4, "amountBaseUnits": "1000000" }
  ]
}`;

const events = [
  "NodeCreated",
  "NativePurchaseAccepted",
  "RewardReserved × 4",
  "SaleFinalized",
  "RewardClaimed",
] as const;

export function DevelopersScreen() {
  return (
    <AppFrame active="developers" title="Developers">
      <div className="flex h-[480px] gap-3">
        <div className="bg-ink flex-1 rounded-xl p-5 font-mono text-[11px] leading-[1.6]">
          <p className="text-faint">
            <span className="text-lime">GET</span> /v1/receipts/10143/1042
          </p>
          <pre className="text-soft mt-4 whitespace-pre">{response}</pre>
        </div>
        <div className="bg-surface border-hairline w-[260px] shrink-0 rounded-xl border p-4">
          <p className="text-[12px] font-medium">Events behind this receipt</p>
          <ol className="mt-3 flex flex-col gap-2">
            {events.map((event, index) => (
              <li key={event} className="flex items-center gap-2 text-[11px]">
                <span className="bg-pill text-muted flex size-5 items-center justify-center rounded-full text-[9px] font-semibold">
                  {index + 1}
                </span>
                <span className="font-mono">{event}</span>
              </li>
            ))}
          </ol>
          <p className="text-subtle mt-4 text-[10px]">
            Any app can read the same campaigns, graphs and receipts the Spoke site shows.
          </p>
        </div>
      </div>
    </AppFrame>
  );
}
