"use client";

import { demoToken } from "@spoke/protocol";
import Link from "next/link";
import { formatAmount, formatMonBalance } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { welcomeCopy as copy } from "../copy/welcome";
import type { Welcome } from "./use-welcome";

export function WelcomeDone({ flow }: { flow: Welcome }) {
  const funding = useClientQuery("funding.status", {});
  const rows = [
    ["Profile", flow.handle ? `@${flow.handle}` : copy.noHandle],
    [
      "Recovery",
      !flow.recovery ? copy.walletRecovery : flow.backedUp ? copy.backedUp : copy.notBackedUp,
    ],
    ["Test MON", funding.data ? formatMonBalance(BigInt(funding.data.monWei)) : "Checking…"],
    [
      "SDUSD",
      funding.data?.sdusd
        ? formatAmount(BigInt(funding.data.sdusd), demoToken)
        : funding.isPending
          ? "Checking…"
          : "Unavailable",
    ],
  ];
  return (
    <>
      <dl className="divide-hairline border-hairline grid divide-y rounded-xl border px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-3">
            <dt className="text-subtle">{label}</dt>
            <dd className="text-ink text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-subtle text-sm">{copy.also}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {copy.intents
          .filter((option) => option.value !== flow.intent)
          .map((option) => (
            <Link key={option.value} href={option.href} className="text-ink text-sm underline">
              {option.title}
            </Link>
          ))}
        <Link href="/wallet" className="text-ink text-sm underline">
          {copy.wallet}
        </Link>
      </div>
    </>
  );
}
