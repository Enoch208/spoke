"use client";

import { Blockchain01Icon } from "@hugeicons/core-free-icons";
import { explorerAddressUrl, explorerTxUrl } from "@spoke/protocol";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { SaleStateChip } from "@/components/product/state-chips";
import { CopyButton } from "@/components/ui/copy-field";
import { Drawer } from "@/components/ui/drawer";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Timeline } from "@/components/ui/timeline";
import { common, fill } from "@/lib/copy";
import { formatAmount, formatCount, formatDateTime, formatPerson, shortHash } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { activeChain } from "@/lib/wagmi";
import { proofCopy } from "../copy/modals";
import { useCloseOnNavigate } from "../use-close-on-navigate";
import { ProofFacts } from "./proof-facts";

const eventName = (name: string) =>
  Object.hasOwn(proofCopy.eventNames, name)
    ? proofCopy.eventNames[name as keyof typeof proofCopy.eventNames]
    : name;

const amountOf = (value: unknown) =>
  typeof value === "string" && /^\d+$/.test(value) ? BigInt(value) : null;

const snippetFor = (contract: string, saleId: string) =>
  [
    'import { createPublicClient, http } from "viem";',
    'import { monadTestnet, spokeProtocolAbi } from "@spoke/protocol";',
    "",
    "const client = createPublicClient({ chain: monadTestnet, transport: http() });",
    "const sale = await client.readContract({",
    `  address: "${contract}",`,
    "  abi: spokeProtocolAbi,",
    '  functionName: "getSale",',
    `  args: [${saleId}n],`,
    "});",
  ].join("\n");

export default function ReceiptProofDrawer({ props, close }: ModalComponentProps<"M-45">) {
  useCloseOnNavigate(close);
  const demo = props.chainId === "demo";
  const chainId = props.chainId === "demo" ? activeChain.id : props.chainId;
  const viewer = useSessionStore((state) => state.address);
  const receipt = useClientQuery("receipts.get", { saleId: props.saleId, chainId });
  const events = useClientQuery("receipts.events", { saleId: props.saleId, chainId });
  const data = receipt.data;
  const contractUrl =
    data && !demo ? explorerAddressUrl(activeChain.id, data.contractAddress) : null;
  return (
    <Drawer
      wide
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={fill(proofCopy.title, { saleId: props.saleId })}
      badge={data ? <SaleStateChip status={data.state} unlockAt={data.unlockAt} /> : undefined}
      subtitle={
        data
          ? demo
            ? proofCopy.demoSource
            : data.trustMode === "NATIVE_ONCHAIN"
              ? proofCopy.native
              : proofCopy.attested
          : undefined
      }
    >
      {receipt.isPending ? (
        <SkeletonRows rows={6} />
      ) : receipt.error ? (
        <ErrorState
          title={receipt.error.code === "NOT_FOUND" ? proofCopy.notFound : receipt.error.message}
          details={{ code: receipt.error.code, requestId: receipt.error.requestId ?? undefined }}
        />
      ) : data ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-ink font-medium">{proofCopy.facts}</h3>
            <ProofFacts receipt={data} demo={demo} viewer={viewer} />
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="text-ink font-medium">{proofCopy.events}</h3>
            {demo ? <p className="text-subtle text-sm">{proofCopy.simulated}</p> : null}
            <Timeline
              label={proofCopy.events}
              items={(events.data ?? []).map((event) => {
                const url = demo ? null : explorerTxUrl(activeChain.id, event.tx.hash);
                return {
                  key: `${event.tx.hash}-${String(event.logIndex)}`,
                  title: eventName(event.name),
                  body: [
                    event.actor ? formatPerson(event.actor) : null,
                    amountOf(event.args.amount) === null
                      ? null
                      : formatAmount(amountOf(event.args.amount) ?? 0n, data.token),
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  time: formatDateTime(new Date(event.at)),
                  icon: Blockchain01Icon,
                  tone: event.name === "SaleRefunded" ? "pink" : "lilac",
                  meta: demo ? undefined : (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono tabular-nums">
                        {fill(proofCopy.block, {
                          block: formatCount(BigInt(event.tx.blockNumber)),
                        })}
                      </span>
                      <span className="font-mono tabular-nums">{shortHash(event.tx.hash)}</span>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink underline underline-offset-2"
                        >
                          {proofCopy.viewOnExplorer}
                        </a>
                      ) : null}
                    </span>
                  ),
                };
              })}
            />
            {demo ? null : (
              <p className="text-subtle text-sm">
                {fill(proofCopy.indexed, { block: formatCount(BigInt(data.indexedBlock)) })}
              </p>
            )}
          </section>
          <section className="bg-soft flex flex-col gap-3 rounded-2xl p-4">
            <h3 className="text-ink font-medium">{proofCopy.checkTitle}</h3>
            {demo ? (
              <p className="text-body text-sm">{proofCopy.demoCheck}</p>
            ) : (
              <>
                <ol className="text-body list-decimal space-y-1 pl-5 text-sm">
                  {proofCopy.checkSteps.map((step) => (
                    <li key={step}>{step.replace("{saleId}", data.saleId)}</li>
                  ))}
                </ol>
                {contractUrl ? (
                  <a
                    href={contractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink self-start text-sm font-medium underline underline-offset-2"
                  >
                    {common.viewOnExplorer}
                  </a>
                ) : null}
                <div className="relative">
                  <pre className="bg-surface border-hairline overflow-x-auto rounded-xl border p-3 pr-12 font-mono text-sm">
                    {snippetFor(data.contractAddress, data.saleId)}
                  </pre>
                  <CopyButton
                    value={snippetFor(data.contractAddress, data.saleId)}
                    label={proofCopy.snippet}
                    copiedMessage={proofCopy.snippetCopied}
                    className="absolute top-2 right-2"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
