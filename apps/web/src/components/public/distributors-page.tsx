"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductPage, QueryState } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClientQuery } from "@/lib/query/use-client";
import { formatPerson } from "@/lib/format";

export function DistributorsPage() {
  const [q, setQ] = useState("");
  const people = useClientQuery("distributors.search", { q });
  const rows = [...(people.data?.items ?? []), ...(people.data?.newDistributors ?? [])];
  return (
    <ProductPage
      title="Find distribution partners"
      description="Browse the settled records people choose to share. Public history is evidence, not a promise of future sales."
    >
      <Input
        aria-label="Search distributors"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
        }}
        placeholder="Search a handle"
        className="max-w-md"
      />
      <QueryState
        pending={people.isPending}
        error={people.error}
        retry={() => void people.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((person, index) => (
            <Card key={person.handle ?? person.address ?? index}>
              <h2 className="font-display text-h4">
                {person.handle ? (
                  <Link href={`/u/${person.handle}`}>@{person.handle}</Link>
                ) : (
                  formatPerson(person)
                )}
              </h2>
              <p className="text-subtle mt-2 text-sm">
                {person.displayName ?? "Pseudonymous profile"}
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  {person.settledConversions === null
                    ? "Settled conversions not shared"
                    : `${String(person.settledConversions)} settled conversions`}
                </p>
                <p>
                  {person.merchantCount === null
                    ? "Merchant diversity not shared"
                    : `Across ${String(person.merchantCount)} merchants`}
                </p>
              </div>
            </Card>
          ))}
        </div>
        {rows.length === 0 ? (
          <Card>
            <p>No public profiles match this search.</p>
          </Card>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
