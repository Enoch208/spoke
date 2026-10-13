"use client";

import { UserGroupIcon } from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { fill } from "@/lib/copy";
import { formatAmount, formatPerson, formatRelative, type TokenLike } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { distributorsCopy as copy } from "../copy/campaign";
import { ActionMenu, type MenuItem } from "../shared/action-menu";
import { hasModal } from "../shared/has-modal";

type Row = ClientOutput<"campaigns.distributors">["items"][number];

const reserved = (row: Row) => BigInt(row.rewards.atRisk) + BigInt(row.rewards.readyToFinalize);

const joinedText = (row: Row, rows: readonly Row[]) => {
  if (row.parentNodeId === "0") return copy.root;
  const parent = rows.find((candidate) => candidate.nodeId === row.parentNodeId);
  return fill(copy.under, {
    parent: parent
      ? formatPerson({ handle: parent.handle, address: parent.address })
      : row.parentNodeId,
  });
};

const menuFor = (row: Row, campaignId: string): MenuItem[] => [
  ...(hasModal("M-29")
    ? [
        {
          key: "insights",
          label: copy.insights,
          onSelect: () => {
            useUiStore.getState().open("M-29", { address: row.address });
          },
        },
      ]
    : []),
  ...(row.handle
    ? [{ key: "profile", label: copy.profile, href: routeTo.profile(row.handle) }]
    : []),
  ...(hasModal("M-28")
    ? [
        {
          key: "invite",
          label: copy.invite,
          onSelect: () => {
            useUiStore.getState().open("M-28", { address: row.address, campaignId });
          },
        },
      ]
    : []),
];

export function DistributorsTab({ campaignId, token }: { campaignId: string; token: TokenLike }) {
  const rows = useClientQuery("campaigns.distributors", { campaignId, limit: 50 });
  const items = rows.data?.items ?? [];
  const person = (row: Row) => formatPerson({ handle: row.handle, address: row.address });
  return (
    <Card padding="none" className="overflow-hidden">
      {rows.isPending ? (
        <SkeletonRows rows={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={UserGroupIcon} title={copy.empty} body={copy.emptyBody} />
      ) : (
        <>
          <Table caption={copy.title} className="hidden lg:block">
            <THead>
              <tr>
                <Th>{copy.person}</Th>
                <Th>{copy.joined}</Th>
                <Th numeric>{copy.below}</Th>
                <Th numeric>{copy.direct}</Th>
                <Th numeric>{copy.paid}</Th>
                <Th numeric>{copy.reserved}</Th>
                <Th numeric>{copy.settled}</Th>
                <Th numeric>{copy.claimed}</Th>
                <Th>{copy.last}</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {items.map((row) => (
                <Tr key={row.nodeId}>
                  <Td className="text-ink font-medium whitespace-nowrap">{person(row)}</Td>
                  <Td className="text-subtle text-sm whitespace-nowrap">
                    {joinedText(row, items)}
                  </Td>
                  <Td numeric>{row.descendants}</Td>
                  <Td numeric>{row.directSales}</Td>
                  <Td numeric>{row.paidSales}</Td>
                  <Td numeric>{formatAmount(reserved(row), token)}</Td>
                  <Td numeric>{formatAmount(BigInt(row.rewards.claimable), token)}</Td>
                  <Td numeric>{formatAmount(BigInt(row.rewards.claimed), token)}</Td>
                  <Td className="text-subtle text-sm whitespace-nowrap">
                    {row.lastActivityAt ? formatRelative(new Date(row.lastActivityAt)) : "—"}
                  </Td>
                  <Td>
                    <ActionMenu
                      label={fill(copy.menu, { name: person(row) })}
                      items={menuFor(row, campaignId)}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <ul className="divide-hairline divide-y lg:hidden">
            {items.map((row) => (
              <li key={row.nodeId} className="space-y-2 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink font-medium">{person(row)}</p>
                    <p className="text-subtle text-xs">{joinedText(row, items)}</p>
                  </div>
                  <ActionMenu
                    label={fill(copy.menu, { name: person(row) })}
                    items={menuFor(row, campaignId)}
                  />
                </div>
                <p className="text-subtle text-xs">
                  {row.directSales} {copy.direct.toLowerCase()} · {row.paidSales}{" "}
                  {copy.paid.toLowerCase()} · {copy.settled}{" "}
                  <span className="text-ink font-mono">
                    {formatAmount(BigInt(row.rewards.claimable), token)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
