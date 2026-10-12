import { AppFrame } from "./app-frame";
import { exampleSplit, exampleToken } from "./example-data";

const terms = [
  { label: "Commission rate", value: "10%" },
  { label: "Per-sale cap", value: `15.00 ${exampleToken}` },
  { label: "Settlement hold", value: "10 minutes" },
  { label: "Short paths", value: "Renormalize" },
] as const;

const previews = [
  { label: "1 person", rows: ["10.00"] },
  { label: "2 people", rows: ["6.67", "3.33"] },
  { label: "4 people", rows: ["5.00", "2.50", "1.50", "1.00"] },
] as const;

export function StudioScreen() {
  return (
    <AppFrame
      active="studio"
      title="Commission studio"
      actions={
        <span className="bg-ink text-soft rounded-full px-3.5 py-1.5 text-[11px] font-medium">
          Fund and launch
        </span>
      }
    >
      <div className="flex h-[480px] gap-3">
        <div className="bg-surface border-hairline flex-1 rounded-xl border p-5">
          <p className="text-[13px] font-medium">Policy for Shader Starter Pack</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {terms.map((term) => (
              <div key={term.label} className="border-hairline rounded-lg border px-3 py-2.5">
                <p className="text-subtle text-[10px]">{term.label}</p>
                <p className="mt-1 text-[12px] font-medium">{term.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] font-medium">Level weights, nearest first</p>
          <ul className="mt-3 flex flex-col gap-3">
            {exampleSplit.map((row, index) => (
              <li key={row.role} className="flex items-center gap-3 text-[11px]">
                <span className="text-muted w-16">Level {index + 1}</span>
                <span className="bg-pill h-2 flex-1 rounded-full">
                  <span
                    className="bg-olive block h-full rounded-full"
                    style={{ width: row.weight }}
                  />
                </span>
                <span className="w-10 text-right font-mono">{row.weight}</span>
              </li>
            ))}
          </ul>
          <p className="bg-lime-soft text-olive mt-5 rounded-lg px-3 py-2 text-[11px] font-medium">
            Weights total 100%. Terms freeze for every accepted sale.
          </p>
        </div>
        <div className="bg-surface border-hairline w-[300px] shrink-0 rounded-xl border p-5">
          <p className="text-[13px] font-medium">Preview a 100.00 {exampleToken} sale</p>
          <p className="text-subtle mt-1 text-[10px]">
            Reward 10.00 {exampleToken}, split by path length
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {previews.map((preview) => (
              <div key={preview.label} className="bg-soft rounded-lg p-3">
                <p className="text-muted text-[10px] font-medium">{preview.label}</p>
                <div className="mt-2 flex gap-1.5">
                  {preview.rows.map((amount, index) => (
                    <span
                      key={`${preview.label}-${String(index)}`}
                      className="bg-surface border-hairline flex-1 rounded-md border py-1.5 text-center font-mono text-[11px]"
                    >
                      {amount}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-subtle mt-4 text-[10px]">
            Every preview sums to exactly 10.00. The remainder goes to the nearest person.
          </p>
        </div>
      </div>
    </AppFrame>
  );
}
