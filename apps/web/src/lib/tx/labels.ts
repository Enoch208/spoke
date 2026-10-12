import { demoToken } from "@spoke/protocol";
import { fill, txActions } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import type { AnyTxRecord } from "./types";

const sdusd = (minor: string) => formatAmount(BigInt(minor), demoToken);

export const txLabel = (record: AnyTxRecord): string => {
  switch (record.kind) {
    case "createCampaign":
      return fill(txActions.createCampaign.label, { campaign: record.params.campaignName });
    case "fundCampaign":
      return fill(txActions.fundCampaign.label, { campaign: record.params.campaignName });
    case "createNode":
      return txActions.createNode.label;
    case "purchase":
      return fill(txActions.purchase.label, { product: record.params.productTitle });
    case "refund":
      return fill(txActions.refund.label, { saleId: record.params.saleId });
    case "finalize":
      return fill(txActions.finalize.label, { saleId: record.params.saleId });
    case "claimRewards":
      return record.params.finalizeSaleIds.length > 0
        ? fill(txActions.claimRewards.label.withFinalize, {
            n: String(Math.min(record.params.finalizeSaleIds.length, 10)),
            amount: sdusd(record.params.amount),
          })
        : fill(txActions.claimRewards.label.claim, { amount: sdusd(record.params.amount) });
    case "claimProceeds":
      return record.params.campaignName
        ? fill(txActions.claimProceeds.label.oneCampaign, { campaign: record.params.campaignName })
        : txActions.claimProceeds.label.allCampaigns;
    case "withdrawUnused":
      return txActions.withdrawUnused.label;
    case "pause":
      return fill(txActions.pause.label, { campaign: record.params.campaignName });
    case "resume":
      return fill(txActions.resume.label, { campaign: record.params.campaignName });
    case "end":
      return fill(txActions.end.label, { campaign: record.params.campaignName });
    case "registerPolicyVersion":
      return fill(txActions.registerPolicyVersion.label, { campaign: record.params.campaignName });
    case "mintDemoTokens":
      return fill(txActions.mintDemoTokens.label, { amount: sdusd(record.params.amount) });
  }
};
