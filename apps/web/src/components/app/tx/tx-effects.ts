import { activeChain } from "@/lib/wagmi";
import { useCheckoutStore } from "@/lib/stores/checkout";
import type { SpokeClient } from "@/lib/client/types";
import type { AnyTxRecord, Hex } from "@/lib/tx/types";
import { useUiStore } from "@/lib/stores/ui";

export const attachCheckoutHash = (client: SpokeClient, record: AnyTxRecord, hash: Hex) => {
  if (record.kind !== "purchase" || !record.params.intentId) return;
  const step = record.steps.find((candidate) => candidate.hash === hash);
  if (step?.kind !== "purchase") return;
  useCheckoutStore.getState().updateDraft(record.params.campaignId, { txSent: true });
  void client
    .call("checkout.attachTransaction", { id: record.params.intentId, txHash: hash })
    .catch(() => {
      useUiStore.getState().pushToast({
        id: "T-12",
        tone: "info",
        message:
          "Your transaction was sent. The checkout record is still syncing; keep the transaction hash and check your purchase.",
        durationMs: 8000,
      });
    });
};

export const copyLinkFor = async (client: SpokeClient, nodeId: string) => {
  const link = await client.call("links.get", { nodeId });
  await navigator.clipboard.writeText(link.url);
};

export const explorerTx = (record: AnyTxRecord, fallback: () => void) => {
  const hash = record.steps.toReversed().find((step) => step.hash)?.hash;
  if (!hash || record.mode !== "live") {
    fallback();
    return;
  }
  window.open(
    `${activeChain.blockExplorers?.default.url ?? "https://testnet.monadvision.com"}/tx/${hash}`,
    "_blank",
    "noopener,noreferrer",
  );
};

export const reportTx = (record: AnyTxRecord) => {
  useUiStore.getState().open("M-41", { context: { transaction: record.id, action: record.kind } });
};
