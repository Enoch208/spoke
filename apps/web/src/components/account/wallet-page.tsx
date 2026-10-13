"use client";

import { FundsPanel } from "@/components/buy/funds-panel";
import { ProductPage, PageLink } from "@/components/product/page";
import { CopyField } from "@/components/ui/copy-field";
import { useSessionStore } from "@/lib/stores/session";

export function WalletPage() {
  const address = useSessionStore((state) => state.address);
  return (
    <ProductPage
      title="Your testnet wallet"
      description="MON pays network fees. SDUSD is a demo settlement token with no cash value."
      actions={
        <>
          <PageLink href="/wallet/fund">Mainnet funding</PageLink>
          <PageLink href="/settings/wallets">Linked addresses</PageLink>
        </>
      }
    >
      {address ? (
        <CopyField value={address} label="Copy your address" copiedMessage="Address copied" />
      ) : null}
      <FundsPanel />
    </ProductPage>
  );
}
