"use client";

import { ProductPage } from "@/components/product/page";
import { useClientQuery } from "@/lib/query/use-client";
import { payoutsCopy } from "../copy/payouts";
import { TestnetFootnote } from "../shared/footnote";
import { ProofFooter } from "../shared/proof-footer";
import { ClaimRows } from "./claim-rows";
import { FinalizeSection } from "./finalize-section";
import { HistorySection } from "./history-section";
import { HoldsSection } from "./holds-section";

export function PayoutsPage() {
  const summary = useClientQuery("earnings.summary", {});
  return (
    <ProductPage title={payoutsCopy.title} description={payoutsCopy.description}>
      <ClaimRows />
      <FinalizeSection />
      <HoldsSection />
      <HistorySection />
      <ProofFooter method="claimRewards" indexedBlock={summary.data?.indexedBlock} />
      <TestnetFootnote />
    </ProductPage>
  );
}
