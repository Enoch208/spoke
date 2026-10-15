"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { InsightsPanel } from "@/components/platform/insights-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function WalletResearch() {
  const [draft, setDraft] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  return (
    <Card>
      <details>
        <summary className="cursor-pointer font-medium">Research a public wallet</summary>
        <p className="text-subtle mt-3 max-w-[75ch] text-sm">
          Bring a wallet address into your partner review. External wallets are not automatically
          Spoke distributors. Use the directory to compare opted-in profiles and send campaign
          invitations.
        </p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (isAddress(draft.trim())) setAddress(draft.trim());
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="partner-research-address" className="sr-only">
              Public EVM wallet address
            </label>
            <Input
              id="partner-research-address"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              placeholder="0x… public wallet address"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!isAddress(draft.trim())}>
            Open research
          </Button>
        </form>
        {address ? (
          <div className="mt-4" key={address.toLowerCase()}>
            <p className="mb-3 font-mono break-all text-xs">Researching {address}</p>
            <InsightsPanel address={address} />
          </div>
        ) : null}
      </details>
    </Card>
  );
}
