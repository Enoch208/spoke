"use client";

import type { ClientOutput } from "@spoke/protocol";
import { formatDateTime } from "@/lib/format";

type Research = NonNullable<ClientOutput<"insights.forDistributor">["research"]>;
const explorers: Record<string, string> = {
  monad: "https://monadvision.com",
  ethereum: "https://etherscan.io",
  base: "https://basescan.org",
  arbitrum: "https://arbiscan.io",
  optimism: "https://optimistic.etherscan.io",
  polygon: "https://polygonscan.com",
  bnb: "https://bscscan.com",
  avalanche: "https://snowtrace.io",
};
function Proof({ row }: { row: Research["transactions"][number] }) {
  const base = explorers[row.chain];
  return (
    <div className="text-subtle mt-1 break-words text-xs">
      {row.chain} · {formatDateTime(new Date(row.timestamp))} ·{" "}
      {base && /^0x[0-9a-f]{64}$/i.test(row.transactionHash) ? (
        <a
          className="underline"
          href={`${base}/tx/${row.transactionHash}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction
        </a>
      ) : (
        <span className="font-mono break-all">{row.transactionHash}</span>
      )}
    </div>
  );
}
export function ResearchEvidence({ research }: { research: Research }) {
  return (
    <div className="border-hairline mt-5 space-y-5 border-t pt-5">
      <section>
        <h3 className="font-medium">First observed funding</h3>
        <p className="text-subtle mt-1 text-xs">
          Earliest native-token funding returned by Nansen. This is not the wallet’s creation date
          or proof of ownership.
        </p>
        {research.firstFunding ? (
          <div className="mt-2 text-sm">
            <p>{research.firstFunding.label ?? "Unlabelled funder"}</p>
            <p className="font-mono break-all text-xs">{research.firstFunding.address}</p>
            <Proof row={research.firstFunding} />
          </div>
        ) : (
          <p className="text-subtle mt-2 text-sm">Not reported in this lookup.</p>
        )}
      </section>
      <section>
        <h3 className="font-medium">Observed relationships · Monad Mainnet</h3>
        <p className="text-subtle mt-1 text-xs">
          Provider-reported connections are review context, not evidence that wallets share an
          owner.
        </p>
        {research.relationships.length ? (
          <ul className="mt-3 space-y-3">
            {research.relationships.map((row, index) => (
              <li key={`${row.address}:${String(index)}`} className="text-sm">
                <p>
                  {row.label ?? "Unlabelled wallet"} · {row.relation}
                </p>
                <p className="font-mono break-all text-xs">{row.address}</p>
                <Proof row={row} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-subtle mt-2 text-sm">
            No relationships reported. Other networks are not included in this check.
          </p>
        )}
      </section>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          Transaction evidence ({research.transactions.length} shown)
        </summary>
        <p className="text-subtle mt-2 text-xs">
          {research.sampledTransactions} transactions sampled.{" "}
          {research.truncated
            ? "The result is capped; it is not a total."
            : "The provider returned the complete page for this window."}
        </p>
        <ul className="mt-3 space-y-3">
          {research.transactions.map((row, index) => (
            <li key={`${row.chain}:${row.transactionHash}:${String(index)}`}>
              <Proof row={row} />
            </li>
          ))}
        </ul>
      </details>
      <section className="text-xs">
        <h3 className="font-medium">Sources & coverage</h3>
        <p className="text-subtle mt-2">
          Activity window: {formatDateTime(new Date(research.window.from))} –{" "}
          {formatDateTime(new Date(research.window.to))}. Funding and relationship lookups have
          their own historical coverage.
        </p>
        <ul className="mt-2 space-y-2">
          {research.endpoints.map((endpoint) => (
            <li key={endpoint.endpoint}>
              <a className="underline" href={endpoint.sourceUrl} target="_blank" rel="noreferrer">
                Nansen {endpoint.endpoint}
              </a>{" "}
              ·{" "}
              {endpoint.state === "unavailable"
                ? "Unavailable; do not interpret as no history"
                : endpoint.state === "empty"
                  ? "No matching records returned"
                  : "Evidence returned"}{" "}
              · fetched {formatDateTime(new Date(endpoint.fetchedAt))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
