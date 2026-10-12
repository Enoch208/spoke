"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLiveClient } from "@/lib/client/provider";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Input } from "@/components/ui/input";
import { useClientQuery } from "@/lib/query/use-client";
import { publicEnv } from "@/lib/public-env";

export function DevelopersPage({ section = "overview" }: { section?: string }) {
  const contracts = useClientQuery("system.contracts", {}, { live: true });
  const endpoints = useClientQuery("system.endpoints", {}, { live: true });
  const live = useLiveClient();
  const run = useMutation({
    mutationFn: (input: { path: string }) => live.call("playground.run", input),
  });
  const [path, setPath] = useState("/v1/campaigns");
  return (
    <ProductPage
      title={
        section === "contracts"
          ? "Settlement contracts"
          : section === "api"
            ? "Public read API"
            : section === "playground"
              ? "API playground"
              : "Build on the distribution graph"
      }
      description="Live testnet data. Read campaign policies, branch ancestry, settled receipts and portable records from the same canonical API."
      actions={
        <div className="flex flex-wrap gap-2">
          <PageLink href="/developers/api">API reference</PageLink>
          <PageLink href="/developers/contracts">Contracts</PageLink>
          <PageLink href="/developers/playground">Playground</PageLink>
        </div>
      }
    >
      <Card>
        <h2 className="font-display text-h4">One sale, one immutable record</h2>
        <p className="text-body mt-3">
          Buyer payments and merchant-funded rewards stay separate. A purchase snapshots its policy
          and eligible link path. Refunds before the hold end release rewards; finalization makes
          proceeds and rewards claimable. The chain is the money ledger.
        </p>
        <div className="mt-4">
          <CopyField
            value={`${publicEnv.NEXT_PUBLIC_API_URL}/v1`}
            label="Copy API base URL"
            copiedMessage="API base URL copied"
          />
        </div>
      </Card>
      <QueryState
        pending={contracts.isPending}
        error={contracts.error}
        retry={() => void contracts.refetch()}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {contracts.data?.contracts.map((contract) => (
            <Card key={contract.address} className="min-w-0">
              <h2 className="font-display text-h4">{contract.name}</h2>
              <p className="text-subtle mt-2 text-sm">
                Version {contract.version} ·{" "}
                {contract.sourceVerified ? "Source verified" : "Source not verified"}
              </p>
              <div className="mt-4">
                <CopyField
                  value={contract.address}
                  label={`Copy ${contract.name} address`}
                  copiedMessage="Contract address copied"
                />
              </div>
              <a
                href={`https://testnet.monadvision.com/address/${contract.address}`}
                className="mt-3 block text-sm underline"
                target="_blank"
                rel="noreferrer"
              >
                Inspect on MonadVision
              </a>
            </Card>
          ))}
        </div>
      </QueryState>
      {section === "playground" ? (
        <Card>
          <h2 className="font-display text-h4">Try a public GET</h2>
          <div className="mt-4 flex gap-2">
            <Input
              aria-label="API path"
              value={path}
              onChange={(event) => {
                setPath(event.target.value);
              }}
            />
            <Button
              loading={run.isPending}
              onClick={() => {
                run.mutate({ path });
              }}
            >
              Run
            </Button>
          </div>
          {run.error ? <p className="text-pink-ink mt-3">{run.error.message}</p> : null}
          {run.data ? (
            <pre className="bg-soft mt-4 overflow-x-auto rounded-xl p-4 font-mono text-xs">
              {run.data.status} · {Math.round(run.data.durationMs)} ms{`\n`}
              {run.data.body}
            </pre>
          ) : null}
        </Card>
      ) : null}
      {section === "api" || section === "overview" ? (
        <Card>
          <h2 className="font-display text-h4">Endpoints</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Method</th>
                  <th className="p-2">Path</th>
                  <th className="p-2">Access</th>
                  <th className="p-2">Availability</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.data
                  ?.filter((endpoint) => section === "api" || endpoint.auth === "public")
                  .map((endpoint) => (
                    <tr
                      key={`${endpoint.method}-${endpoint.path}`}
                      className="border-hairline border-t"
                    >
                      <td className="p-2 font-mono">{endpoint.method}</td>
                      <td className="p-2 font-mono">{endpoint.path}</td>
                      <td className="p-2">{endpoint.auth}</td>
                      <td className="p-2">{endpoint.availability.replaceAll("_", " ")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {endpoints.error ? <p className="text-pink-ink">{endpoints.error.message}</p> : null}
        </Card>
      ) : null}
      <Card>
        <h2 className="font-display text-h4">Read before integrating</h2>
        <p className="text-body mt-3">
          Public API data is indexed evidence. Verify money-changing decisions against the contract
          and pin reads to a block. Profile visibility applies to public discovery; pseudonymous
          records never expose addresses or receipt links. Authentication, CSRF protection and
          ownership checks are required for private methods.
        </p>
        <p className="text-body mt-3">
          Write SDK methods, external checkout integrations, widgets and signed credentials are
          designed previews. They are not live settlement guarantees.
        </p>
        <Link href="/legal/disclosures" className="mt-4 block underline">
          Read disclosures
        </Link>
      </Card>
    </ProductPage>
  );
}
