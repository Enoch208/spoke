"use client";

import { CheckmarkCircle02Icon, HelpCircleIcon } from "@hugeicons/core-free-icons";
import { isSupportedChainId } from "@spoke/protocol";
import { Address, TxHash } from "@/components/ui/address";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { SectionError } from "../shared/section-error";
import { statusCopy } from "./status-copy";

export function ContractsTable({ chainId }: { chainId: number }) {
  const contracts = useClientQuery("system.contracts", {}, { live: true });
  const chain = isSupportedChainId(chainId) ? chainId : null;
  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <h2 className="font-display text-h4 text-ink font-medium">{statusCopy.contractsHeading}</h2>
      {contracts.error ? (
        <SectionError retry={() => void contracts.refetch()} />
      ) : !contracts.data || !chain ? (
        <p className="text-subtle text-sm">{statusCopy.words.checking}</p>
      ) : (
        <>
          <ul className="divide-hairline flex flex-col divide-y sm:hidden">
            {contracts.data.contracts.map((contract) => (
              <li key={contract.address} className="flex flex-col gap-1.5 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink font-medium">{contract.name}</span>
                  <StatusChip
                    label={contract.sourceVerified ? statusCopy.verified : statusCopy.notVerified}
                    icon={contract.sourceVerified ? CheckmarkCircle02Icon : HelpCircleIcon}
                    tone={contract.sourceVerified ? "lime" : "faint"}
                  />
                </div>
                <Address address={contract.address} chainId={chain} />
                <span className="text-subtle">
                  {statusCopy.deployedBlock} {formatCount(BigInt(contract.deployedBlock))}
                </span>
                <TxHash hash={contract.deploymentTx} chainId={chain} />
              </li>
            ))}
          </ul>
          <Table caption={statusCopy.contractsCaption} className="hidden sm:block">
            <THead>
              <tr>
                <Th>{statusCopy.contract}</Th>
                <Th>{statusCopy.address}</Th>
                <Th numeric>{statusCopy.deployedBlock}</Th>
                <Th>{statusCopy.deploymentTx}</Th>
                <Th>{statusCopy.verified}</Th>
              </tr>
            </THead>
            <TBody>
              {contracts.data.contracts.map((contract) => (
                <Tr key={contract.address}>
                  <Td className="font-medium">{contract.name}</Td>
                  <Td>
                    <Address address={contract.address} chainId={chain} />
                  </Td>
                  <Td numeric>{formatCount(BigInt(contract.deployedBlock))}</Td>
                  <Td>
                    <TxHash hash={contract.deploymentTx} chainId={chain} />
                  </Td>
                  <Td>
                    <StatusChip
                      label={contract.sourceVerified ? statusCopy.verified : statusCopy.notVerified}
                      icon={contract.sourceVerified ? CheckmarkCircle02Icon : HelpCircleIcon}
                      tone={contract.sourceVerified ? "lime" : "faint"}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </>
      )}
    </Card>
  );
}
