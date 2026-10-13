"use client";

import { useState } from "react";
import { FundsPanel } from "@/components/buy/funds-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function WelcomeFunding({ demo }: { demo: boolean }) {
  const [gas, setGas] = useState(false);
  const [tokens, setTokens] = useState(false);
  if (!demo) return <FundsPanel />;
  return (
    <Card>
      <h2 className="text-ink font-medium">Try adding test funds</h2>
      <p className="text-subtle mt-2 text-sm">
        This setup preview keeps the sample account unchanged. You can try simulated funding from
        Wallet after setup.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="bg-soft grid gap-2 rounded-xl p-3">
          <p className="text-subtle text-sm">Test MON · setup preview</p>
          <p className="text-ink font-mono">{gas ? "0.02 MON" : "0 MON"}</p>
          <Button
            size="sm"
            variant="secondary"
            disabled={gas}
            onClick={() => {
              setGas(true);
            }}
          >
            {gas ? "Sample MON added" : "Simulate adding MON"}
          </Button>
        </div>
        <div className="bg-soft grid gap-2 rounded-xl p-3">
          <p className="text-subtle text-sm">SDUSD · setup preview</p>
          <p className="text-ink font-mono">{tokens ? "100.00 SDUSD" : "0.00 SDUSD"}</p>
          <Button
            size="sm"
            variant="secondary"
            disabled={!gas || tokens}
            onClick={() => {
              setTokens(true);
            }}
          >
            {tokens ? "Sample SDUSD added" : "Simulate adding SDUSD"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
