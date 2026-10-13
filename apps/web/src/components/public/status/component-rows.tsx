"use client";

import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import type { ClientOutput, SubsystemHealth } from "@spoke/protocol";
import { useBlockNumber } from "wagmi";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { formatCount, formatRelative, pluralize } from "@/lib/format";
import { monadTestnet } from "@spoke/protocol";
import { indexerHealth } from "./overall";
import { statusCopy } from "./status-copy";

const chips = {
  ok: { icon: CheckmarkCircle02Icon, tone: "lime" },
  degraded: { icon: Alert02Icon, tone: "amber" },
  down: { icon: CancelCircleIcon, tone: "pink" },
  not_configured: { icon: HelpCircleIcon, tone: "faint" },
} as const;

function Row({
  name,
  state,
  detail,
}: {
  name: string;
  state: SubsystemHealth | "checking";
  detail?: string | null | undefined;
}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-ink font-medium">{name}</span>
        {detail ? <span className="text-subtle text-sm break-words">{detail}</span> : null}
      </div>
      {state === "checking" ? (
        <span className="text-subtle shrink-0 text-sm">{statusCopy.words.checking}</span>
      ) : (
        <StatusChip
          label={statusCopy.words[state]}
          icon={chips[state].icon}
          tone={chips[state].tone}
        />
      )}
    </li>
  );
}

export function DirectChainCheck() {
  const block = useBlockNumber({
    chainId: monadTestnet.id,
    query: { refetchInterval: 15_000 },
  });
  const state: SubsystemHealth | "checking" = block.isPending
    ? "checking"
    : block.isError
      ? "down"
      : "ok";
  return (
    <Card>
      <ul>
        <Row
          name={
            block.isPending
              ? statusCopy.direct.name
              : block.isError
                ? statusCopy.direct.unreachable
                : statusCopy.direct.reachable
          }
          state={state}
          detail={
            block.data === undefined
              ? null
              : fill(statusCopy.direct.block, { block: formatCount(block.data) })
          }
        />
      </ul>
    </Card>
  );
}

export function ComponentRows({
  health,
  status,
}: {
  health: ClientOutput<"system.health"> | undefined;
  status: ClientOutput<"system.status"> | undefined;
}) {
  const indexer = status?.indexer;
  const indexerDetail =
    indexer?.indexedBlock && indexer.lagBlocks !== null
      ? fill(statusCopy.indexerDetail, {
          indexed: formatCount(BigInt(indexer.indexedBlock)),
          head: formatCount(BigInt(indexer.chainHead)),
          lagBlocks: pluralize(BigInt(indexer.lagBlocks), "block"),
          lagSeconds: String(Math.round(indexer.lagSeconds ?? 0)),
        })
      : null;
  const reconciliation = status?.reconciliation;
  return (
    <Card padding="lg" className="flex flex-col gap-2">
      <h2 className="font-display text-h4 text-ink font-medium">{statusCopy.componentsHeading}</h2>
      <ul className="divide-hairline flex flex-col divide-y">
        <Row name={statusCopy.components.website} state="ok" />
        <Row name={statusCopy.components.api} state={health?.api ?? "checking"} />
        <Row name={statusCopy.components.database} state={health?.database ?? "checking"} />
        <Row
          name={statusCopy.components.rpc}
          state={health?.rpc ?? "checking"}
          detail={
            health?.chainHead && indexer
              ? fill(statusCopy.chainDetail, {
                  chainId: String(health.chainId),
                  head: formatCount(BigInt(health.chainHead)),
                  relative: formatRelative(new Date(indexer.chainTime)),
                })
              : null
          }
        />
        <Row
          name={
            indexer?.name
              ? `${statusCopy.components.indexer} · ${indexer.name}`
              : statusCopy.components.indexer
          }
          state={health ? indexerHealth(health, status) : "checking"}
          detail={indexerDetail}
        />
      </ul>
      {reconciliation ? (
        <p className="text-subtle text-sm">
          {fill(statusCopy.reconciliation, {
            block: formatCount(BigInt(reconciliation.blockNumber)),
            differences: pluralize(reconciliation.mismatches.length, "difference"),
          })}
        </p>
      ) : null}
    </Card>
  );
}
