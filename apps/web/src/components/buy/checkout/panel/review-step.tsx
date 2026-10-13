"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { formatAmount, formatPerson } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { stepCopy } from "../../copy/steps";
import type { Checkout } from "../use-checkout";

const copy = stepCopy.review;

function Line({ index, done, text }: { index: number; done: boolean; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cx(
          "ease-spring flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm transition-colors duration-[423ms]",
          done ? "bg-lime-soft text-lime-ink" : "bg-pill text-subtle",
        )}
      >
        {done ? <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} /> : index}
      </span>
      <span className={cx("pt-0.5 text-sm", done ? "text-ink" : "text-body")}>
        {text}
        {done ? <span className="sr-only"> · done</span> : null}
      </span>
    </li>
  );
}

export function ReviewStep({ checkout }: { checkout: Checkout }) {
  const me = useClientQuery("account.me", {}, { enabled: checkout.signedIn });
  const campaign = checkout.campaign.data;
  if (!campaign) return null;
  const name = formatPerson({ handle: me.data?.handle ?? null, address: checkout.address });
  const fundsDone = checkout.signedIn && checkout.tokenReady && checkout.monReady;
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        <Line
          index={1}
          done={checkout.signedIn}
          text={checkout.signedIn ? fill(copy.done.account, { name }) : copy.lines.account}
        />
        <Line
          index={2}
          done={fundsDone}
          text={
            fundsDone ? fill(copy.done.funds, { symbol: campaign.token.symbol }) : copy.lines.funds
          }
        />
        <Line
          index={3}
          done={false}
          text={fill(copy.lines.pay, { price: formatAmount(checkout.price, campaign.token) })}
        />
      </ol>
      {checkout.referral.nodeId === "0" ? (
        <p className="text-subtle text-sm">{copy.direct}</p>
      ) : null}
    </div>
  );
}
