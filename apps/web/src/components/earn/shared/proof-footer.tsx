"use client";

import type { ReactNode } from "react";
import { Address } from "@/components/ui/address";
import { KeyValue } from "@/components/ui/key-value";
import { useClientContext } from "@/lib/client/provider";
import { common } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { activeChain } from "@/lib/wagmi";
import { proofLabels } from "../copy/money";

export function ProofFooter({
  method,
  indexedBlock,
  extra = [],
}: {
  method?: string;
  indexedBlock?: string | null | undefined;
  extra?: readonly { key: string; label: string; value: ReactNode; mono?: boolean }[];
}) {
  const { mode } = useClientContext();
  const contracts = useClientQuery("system.contracts", {}, { enabled: mode === "live" });
  const address = (name: string) =>
    contracts.data?.contracts.find((contract) => contract.name === name)?.address;
  const protocol = address("SpokeProtocol");
  const token = address("SpokeDemoUSD");
  const items = [
    ...(mode === "live" && protocol
      ? [
          {
            key: "protocol",
            label: proofLabels.protocol,
            value: <Address address={protocol} chainId={activeChain.id} showAddress />,
          },
        ]
      : []),
    ...(mode === "live" && token
      ? [
          {
            key: "token",
            label: proofLabels.token,
            value: <Address address={token} chainId={activeChain.id} showAddress />,
          },
        ]
      : []),
    ...(method ? [{ key: "method", label: proofLabels.method, value: method, mono: true }] : []),
    ...extra,
    {
      key: "block",
      label: proofLabels.indexed,
      value:
        mode === "demo"
          ? common.simulated
          : indexedBlock
            ? formatCount(BigInt(indexedBlock))
            : proofLabels.notIndexed,
      mono: mode === "live",
    },
  ];
  return (
    <details className="group border-hairline rounded-2xl border px-5 py-3">
      <summary className="text-ink cursor-pointer list-none py-1 text-sm font-medium">
        {proofLabels.title}
      </summary>
      <KeyValue items={items} className="mt-1" />
    </details>
  );
}
