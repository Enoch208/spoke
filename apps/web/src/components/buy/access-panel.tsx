"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientQuery } from "@/lib/query/use-client";
import { useModeStore } from "@/lib/stores/mode";

export function AccessPanel({ saleId }: { saleId: string }) {
  const access = useClientQuery("fulfillment.access", { saleId }, { staleTime: 0 });
  const mode = useModeStore((state) => state.mode);
  return (
    <Card>
      <h2 className="font-display text-h4">Your product</h2>
      <p className="text-subtle mt-2 text-sm">
        Access checks your confirmed, non-refunded purchase directly onchain.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {access.data?.items.map((item, index) =>
          mode === "demo" ? (
            <p key={item.id} className="bg-lilac-soft rounded-xl p-3 text-sm">
              Sample file {index + 1} · demo. No real download is supplied.
            </p>
          ) : (
            <Button key={item.id} asChild>
              <a href={item.url} target="_blank" rel="noreferrer">
                Open product {index + 1}
              </a>
            </Button>
          ),
        )}
      </div>
      {access.data?.items.length === 0 ? (
        <p className="text-body mt-3">
          The merchant arranges delivery separately. Check their product description for
          instructions.
        </p>
      ) : null}
      {access.error ? (
        <p role="alert" className="text-pink-ink mt-3">
          {access.error.message}
        </p>
      ) : null}
      <Button className="mt-4" variant="ghost" onClick={() => void access.refetch()}>
        Refresh access
      </Button>
    </Card>
  );
}
