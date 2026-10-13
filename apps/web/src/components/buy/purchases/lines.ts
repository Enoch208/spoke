import type { SaleStatus } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import { formatDateTime, formatRelative } from "@/lib/format";
import { purchaseCopy } from "../copy/purchase";

const day = 86_400_000;

const clock = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const unlockPhrase = (unlockAt: string, now: number) => {
  const date = new Date(unlockAt);
  const distance = Math.abs(date.getTime() - now);
  return distance < day
    ? `${clock(date)} (${formatRelative(date, { now: new Date(now) })})`
    : formatDateTime(date, { now: new Date(now) });
};

export const holdEnded = (status: SaleStatus, unlockAt: string, now: number) =>
  status === "PENDING" && now >= Date.parse(unlockAt);

export const buyerLine = (input: {
  status: SaleStatus;
  unlockAt: string;
  refundedAt: string | null;
  price: string;
  now: number;
}) => {
  const lines = purchaseCopy.lines;
  const unlockTime = unlockPhrase(input.unlockAt, input.now);
  if (input.status === "REFUNDED")
    return fill(lines.refunded, {
      time: input.refundedAt ? unlockPhrase(input.refundedAt, input.now) : "",
      price: input.price,
    });
  if (input.status === "FINALIZED") return fill(lines.settled, { unlockTime });
  if (holdEnded(input.status, input.unlockAt, input.now))
    return fill(lines.holdEnded, { unlockTime });
  return fill(lines.pending, { unlockTime });
};
