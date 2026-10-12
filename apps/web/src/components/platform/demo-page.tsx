"use client";

import { useSearchParams } from "next/navigation";
import { ProductPage, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/lib/demo/use-demo-mode";
import { personas } from "@/lib/stores/mode";

export function DemoPage({ exit = false }: { exit?: boolean }) {
  const search = useSearchParams();
  const { enterDemo, exitDemo } = useDemoMode();
  return (
    <ProductPage
      title={exit ? "Return to Live testnet" : "Explore a sample workspace"}
      description={
        exit
          ? "Live uses your account and real testnet transactions. Demo actions never transfer real tokens."
          : "Demo uses simulated accounts, products and transactions. You can try the full journey without connecting a wallet."
      }
    >
      {exit ? (
        <Card>
          <p className="text-body">
            Your sample workspace stays on this device. Your Live account and balances are separate.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              exitDemo({ next: search.get("next") });
            }}
          >
            Return to Live
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {personas.map((persona) => (
            <Card key={persona}>
              <p className="text-subtle text-xs uppercase tracking-wide">Simulated workspace</p>
              <h2 className="font-display text-h4 mt-3 capitalize">{persona}</h2>
              <p className="text-body mt-3 text-sm">
                {persona === "merchant"
                  ? "Create a product, fund a reward budget and manage sales."
                  : persona === "distributor"
                    ? "Find a campaign, create a link and inspect your earnings."
                    : "Preview a purchase, inspect its receipt and access a product."}
              </p>
              <Button
                className="mt-5"
                onClick={() => {
                  enterDemo({ persona, next: search.get("next") });
                }}
              >
                Try as {persona}
              </Button>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-6">
        <PageLink href="/explore">Browse Live campaigns</PageLink>
      </div>
    </ProductPage>
  );
}
