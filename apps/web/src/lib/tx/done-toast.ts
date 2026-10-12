import { demoToken } from "@spoke/protocol";
import { fill, txActions } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import type { AnyTxRecord } from "./types";

export type DoneToastAction =
  | { kind: "openCampaign"; campaignId: string }
  | { kind: "openPurchase"; saleId: string }
  | { kind: "copyLink"; nodeId: string }
  | { kind: "viewTransaction" }
  | { kind: "show" };

export type DoneToast = {
  message: string;
  actionLabel: string | null;
  action: DoneToastAction | null;
};

const sdusd = (minor: string) => formatAmount(BigInt(minor), demoToken);

const plain = (message: string): DoneToast => ({ message, actionLabel: null, action: null });

export const doneToast = (record: AnyTxRecord): DoneToast => {
  switch (record.kind) {
    case "createCampaign": {
      const campaignId = record.context.campaignId ?? "";
      const copy = txActions.createCampaign.toast;
      return {
        message: fill(copy.text, { campaignId }),
        actionLabel: campaignId ? copy.action : null,
        action: campaignId ? { kind: "openCampaign", campaignId } : null,
      };
    }
    case "fundCampaign": {
      const copy = txActions.fundCampaign.toast;
      return {
        message: fill(copy.text, { amount: sdusd(record.params.amount) }),
        actionLabel: copy.action,
        action: { kind: "show" },
      };
    }
    case "createNode": {
      const copy = txActions.createNode.toast;
      const nodeId = record.context.nodeId;
      return {
        message: copy.text,
        actionLabel: nodeId ? copy.action : null,
        action: nodeId ? { kind: "copyLink", nodeId } : null,
      };
    }
    case "purchase": {
      const copy = txActions.purchase.toast;
      const saleId = record.context.saleId;
      return {
        message: copy.text,
        actionLabel: saleId ? copy.action : null,
        action: saleId ? { kind: "openPurchase", saleId } : null,
      };
    }
    case "refund":
      return plain(fill(txActions.refund.toast.text, { saleId: record.params.saleId }));
    case "finalize":
      return plain(fill(txActions.finalize.toast.text, { saleId: record.params.saleId }));
    case "claimRewards": {
      const copy = txActions.claimRewards.toast;
      return {
        message: fill(copy.text, { amount: sdusd(record.params.amount) }),
        actionLabel: copy.action,
        action: { kind: "viewTransaction" },
      };
    }
    case "claimProceeds": {
      const copy = txActions.claimProceeds.toast;
      return {
        message: fill(copy.text, { amount: sdusd(record.params.amount) }),
        actionLabel: copy.action,
        action: { kind: "viewTransaction" },
      };
    }
    case "withdrawUnused":
      return plain(
        fill(txActions.withdrawUnused.toast.text, { amount: sdusd(record.params.amount) }),
      );
    case "pause":
      return plain(fill(txActions.pause.toast.text, { campaignName: record.params.campaignName }));
    case "resume":
      return plain(fill(txActions.resume.toast.text, { campaignName: record.params.campaignName }));
    case "end":
      return plain(fill(txActions.end.toast.text, { campaignName: record.params.campaignName }));
    case "registerPolicyVersion":
      return plain(
        fill(txActions.registerPolicyVersion.toast.text, {
          campaignName: record.params.campaignName,
        }),
      );
    case "mintDemoTokens":
      return plain(
        fill(txActions.mintDemoTokens.toast.text, { amount: sdusd(record.params.amount) }),
      );
  }
};
