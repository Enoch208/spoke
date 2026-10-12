import { formatUnits, parseUnits } from "viem";
import { z } from "zod";

export const minorUnitsString = z
  .string()
  .regex(/^\d+$/, "Expected base units as a decimal string");

export const toMinorString = (amount: bigint): string => {
  if (amount < 0n) throw new RangeError("Amounts must be non-negative");
  return amount.toString();
};

export const fromMinorString = (value: string): bigint => BigInt(minorUnitsString.parse(value));

const groupThousands = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const formatTokenAmount = (
  amountMinor: bigint,
  decimals: number,
  minFraction = 2,
): string => {
  const negative = amountMinor < 0n;
  const [whole = "0", fraction = ""] = formatUnits(
    negative ? -amountMinor : amountMinor,
    decimals,
  ).split(".");
  const paddedFraction = fraction.padEnd(Math.min(minFraction, decimals), "0");
  const body = paddedFraction
    ? `${groupThousands(whole)}.${paddedFraction}`
    : groupThousands(whole);
  return negative ? `-${body}` : body;
};

const decimalInput = /^\d+(\.\d+)?$/;

export const parseTokenAmount = (input: string, decimals: number): bigint => {
  const trimmed = input.trim().replaceAll(",", "");
  if (!decimalInput.test(trimmed)) throw new RangeError(`Not a token amount: ${input}`);
  const fraction = trimmed.split(".")[1] ?? "";
  if (fraction.length > decimals) {
    throw new RangeError(`At most ${String(decimals)} decimal places are allowed`);
  }
  return parseUnits(trimmed, decimals);
};
