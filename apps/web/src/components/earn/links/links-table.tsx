"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { routeTo } from "@/lib/routes";
import { Tooltip } from "@/components/ui/tooltip";
import { formatCount } from "@/lib/format";
import { linksPageCopy as copy } from "../copy/links-page";
import type { LinkRow } from "../shared/campaigns";
import { LinkStateChip, linkStatus } from "../shared/link-status";
import { LinkActions, ShareButton } from "./link-actions";
import {
  EarnedCell,
  PositionLine,
  ProductLink,
  SalesChips,
  StatsValue,
  type LinkStats,
} from "./link-cells";

export function VisitsInfo() {
  return (
    <Tooltip content={copy.visitsTip}>
      <span tabIndex={0} className="text-subtle inline-flex rounded-full align-middle">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={14}
          strokeWidth={1.8}
          aria-label={copy.visitsTip}
        />
      </span>
    </Tooltip>
  );
}

export function LinksTable({
  links,
  stats,
}: {
  links: readonly LinkRow[];
  stats: (nodeId: string) => LinkStats | undefined;
}) {
  const router = useRouter();
  return (
    <>
      <Table caption={copy.title} className="max-lg:hidden">
        <THead>
          <tr>
            <Th>{copy.columns.product}</Th>
            <Th>{copy.columns.status}</Th>
            <Th>{copy.columns.position}</Th>
            <Th numeric>
              {copy.columns.visits} <VisitsInfo />
            </Th>
            <Th numeric>{copy.columns.under}</Th>
            <Th>{copy.columns.sales}</Th>
            <Th numeric>{copy.columns.earned}</Th>
            <Th>
              <span className="sr-only">{copy.columns.actions}</span>
            </Th>
          </tr>
        </THead>
        <TBody>
          {links.map((link) => {
            const row = stats(link.nodeId);
            return (
              <Tr
                key={link.nodeId}
                interactive
                onClick={() => {
                  router.push(routeTo.link(link.nodeId));
                }}
              >
                <Td className="min-w-[180px] py-3">
                  <ProductLink link={link} />
                </Td>
                <Td>
                  <LinkStateChip status={linkStatus(link)} />
                </Td>
                <Td className="text-body min-w-[170px] text-sm">
                  <PositionLine link={link} />
                </Td>
                <Td numeric>{formatCount(link.visitsEstimate)}</Td>
                <Td numeric>
                  <StatsValue stats={row} pick={(value) => formatCount(value.descendants)} />
                </Td>
                <Td>
                  <SalesChips stats={row} />
                </Td>
                <Td numeric>
                  <EarnedCell link={link} />
                </Td>
                <Td>
                  <LinkActions link={link} />
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
      <ul className="grid gap-3 lg:hidden">
        {links.map((link) => {
          const row = stats(link.nodeId);
          return (
            <li
              key={link.nodeId}
              className="border-hairline bg-surface grid gap-3 rounded-2xl border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <ProductLink link={link} />
                <LinkStateChip status={linkStatus(link)} />
              </div>
              <p className="text-subtle text-sm">
                <PositionLine link={link} />
              </p>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div className="grid">
                  <dt className="text-subtle">
                    {copy.summary.visits} <VisitsInfo />
                  </dt>
                  <dd className="text-ink font-mono tabular-nums">
                    {formatCount(link.visitsEstimate)}
                  </dd>
                </div>
                <div className="grid">
                  <dt className="text-subtle">{copy.columns.under}</dt>
                  <dd className="text-ink font-mono tabular-nums">
                    <StatsValue stats={row} pick={(value) => formatCount(value.descendants)} />
                  </dd>
                </div>
                <div className="grid">
                  <dt className="text-subtle">{copy.columns.sales}</dt>
                  <dd className="text-ink font-mono tabular-nums">
                    <StatsValue
                      stats={row}
                      pick={(value) =>
                        formatCount(
                          value.sales.pending + value.sales.finalized + value.sales.refunded,
                        )
                      }
                    />
                  </dd>
                </div>
              </dl>
              <SalesChips stats={row} />
              <div className="flex items-center justify-between gap-3">
                <EarnedCell link={link} />
                <LinkActions link={link} share={false} />
              </div>
              <ShareButton link={link} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
