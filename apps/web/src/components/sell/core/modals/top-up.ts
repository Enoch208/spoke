import { parseTokenAmount } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { addBudgetCopy } from "../copy/dialogs";

export type TopUpLimits = {
  token: TokenLike;
  balance: bigint | null;
  room: bigint;
  cap: bigint;
};

export type TopUpCheck = { ok: true; value: bigint } | { ok: false; error: string | null };

const errors = addBudgetCopy.errors;

export const parseTopUp = (input: string, limits: TopUpLimits): TopUpCheck => {
  const trimmed = input.trim().replaceAll(",", "");
  if (!trimmed) return { ok: false, error: null };
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".")
    return { ok: false, error: errors.notNumber };
  const fraction = trimmed.split(".")[1] ?? "";
  if (fraction.length > limits.token.decimals) return { ok: false, error: errors.decimals };
  const value = parseTokenAmount(
    trimmed.startsWith(".") ? `0${trimmed}` : trimmed.replace(/\.$/, ""),
    limits.token.decimals,
  );
  if (value === 0n) return { ok: false, error: errors.zero };
  if (limits.balance !== null && value > limits.balance)
    return {
      ok: false,
      error: fill(errors.balance, { balance: formatAmount(limits.balance, limits.token) }),
    };
  if (value > limits.room)
    return {
      ok: false,
      error: fill(errors.room, {
        cap: formatAmount(limits.cap, limits.token),
        room: formatAmount(limits.room, limits.token),
      }),
    };
  return { ok: true, value };
};

export const maxTopUp = (limits: TopUpLimits) =>
  limits.balance === null || limits.balance > limits.room ? limits.room : limits.balance;
