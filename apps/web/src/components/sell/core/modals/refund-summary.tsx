"use client";

import type { SaleReceipt } from "@spoke/protocol";
import { Address } from "@/components/ui/address";
import { fill } from "@/lib/copy";
import { formatAmount, formatDateTime, shortAddress } from "@/lib/format";
import { activeChain } from "@/lib/wagmi";
import { refundCopy as copy } from "../copy/dialogs";
import { LedgerLines } from "./parts";

export function RefundSummary({
  receipt,
  productTitle,
  demo,
}: {
  receipt: SaleReceipt;
  productTitle: string;
  demo: boolean;
}) {
  const data = receipt;
  const token = receipt.token;
  const people = new Set(receipt.allocations.map((allocation) => allocation.recipient.address))
    .size;
  return (
    <>
      <LedgerLines
        rows={[
          {
            key: "buyer",
            label: copy.buyer,
            value: data.buyer ? (
              <Address
                address={data.buyer}
                chainId={activeChain.id}
                demo={demo}
                copy={false}
                explorer={false}
              />
            ) : (
              "—"
            ),
          },
          {
            key: "product",
            label: copy.product,
            value: productTitle,
            text: true,
          },
          {
            key: "paid",
            label: copy.paid,
            value: formatAmount(BigInt(data.price), token, { testnet: true }),
          },
          {
            key: "time",
            label: copy.time,
            value: formatDateTime(new Date(data.purchasedAt)),
            text: true,
          },
        ]}
      />
      <div>
        <h3 className="text-ink mb-2 text-sm font-medium">{copy.effectsTitle}</h3>
        <ul className="text-body list-disc space-y-1.5 pl-5 text-sm">
          <li>
            {fill(copy.effectBuyer, {
              buyer: data.buyer ? shortAddress(data.buyer) : copy.buyer,
              price: formatAmount(BigInt(data.price), token),
            })}
          </li>
          {BigInt(data.rewardReserved) > 0n ? (
            <li>
              {fill(copy.effectRewards, {
                reward: formatAmount(BigInt(data.rewardReserved), token),
              })}
            </li>
          ) : null}
          {people > 0 ? (
            <li>
              {people === 1 ? copy.effectPeopleOne : fill(copy.effectPeople, { n: String(people) })}
            </li>
          ) : null}
          <li>{copy.effectAccess}</li>
        </ul>
      </div>
    </>
  );
}
