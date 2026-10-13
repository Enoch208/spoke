import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { viewRecord } from "./model";
import { checkoutVisible } from "./use-purchase-record";

const watching = new Set<string>();

export const openDoneWhenConfirmed = (recordId: string) => {
  if (watching.has(recordId)) return;
  watching.add(recordId);
  const unsubscribe = useTxStore.subscribe((state) => {
    const record = state.records.find((candidate) => candidate.id === recordId);
    const view = record ? viewRecord(record) : null;
    if (!record || record.kind !== "purchase" || !view || view.kind === "stopped") {
      watching.delete(recordId);
      unsubscribe();
      return;
    }
    if (view.kind !== "done") return;
    watching.delete(recordId);
    unsubscribe();
    if (!view.saleId || checkoutVisible(record.params.campaignId)) return;
    useUiStore.getState().open("M-18", {
      saleId: view.saleId,
      campaignId: record.params.campaignId,
      ...(record.params.nodeId === "0" ? {} : { nodeId: record.params.nodeId }),
    });
  });
};
