import { explorerTxUrl, type ClientOutput } from "@spoke/protocol";
import { activeChain } from "@/lib/wagmi";

type TxRef = ClientOutput<"receipts.get">["purchaseTx"];

export const txUrl = (tx: TxRef | null, demo: boolean) =>
  !tx || demo ? null : (tx.explorerUrl ?? explorerTxUrl(activeChain.id, tx.hash));

export function TxLink({ tx, demo, label }: { tx: TxRef | null; demo: boolean; label: string }) {
  const url = txUrl(tx, demo);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-ink self-start text-sm font-medium underline underline-offset-2"
    >
      {label}
    </a>
  );
}
