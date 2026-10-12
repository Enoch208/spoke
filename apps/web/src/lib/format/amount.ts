import { formatTokenAmount } from "@spoke/protocol";
import { formatUnits } from "viem";

export type TokenLike = { readonly decimals: number; readonly symbol: string };

const nbsp = " ";
const minus = "−";
const monDecimals = 18;

export const testnetSuffix = " · testnet";

export const formatAmount = (
  amount: bigint,
  token: TokenLike,
  options: { testnet?: boolean } = {},
) => {
  const body = `${formatTokenAmount(amount, token.decimals)}${nbsp}${token.symbol}`;
  return options.testnet ? `${body}${testnetSuffix}` : body;
};

export const formatSignedAmount = (amount: bigint, token: TokenLike) => {
  if (amount === 0n) return formatAmount(0n, token);
  const sign = amount < 0n ? minus : "+";
  return `${sign}${formatAmount(amount < 0n ? -amount : amount, token)}`;
};

export const formatAmountRange = (low: bigint, high: bigint, token: TokenLike) =>
  `${formatTokenAmount(low, token.decimals)}–${formatTokenAmount(high, token.decimals)}${nbsp}${token.symbol}`;

const splitUnits = (value: bigint, decimals: number) => {
  const [whole = "0", fraction = ""] = formatUnits(value, decimals).split(".");
  return { whole, fraction };
};

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const formatMonBalance = (wei: bigint) => {
  const { whole, fraction } = splitUnits(wei < 0n ? 0n : wei, monDecimals);
  return `${groupThousands(whole)}.${fraction.slice(0, 4).padEnd(4, "0")}${nbsp}MON`;
};

const significantFeeDigits = 6;

const roundUpSignificant = (wei: bigint) => {
  const digits = wei.toString();
  if (digits.length <= significantFeeDigits) return wei;
  const scale = 10n ** BigInt(digits.length - significantFeeDigits);
  return ((wei + scale - 1n) / scale) * scale;
};

export const formatMonFee = (wei: bigint) => {
  const rounded = roundUpSignificant(wei < 0n ? 0n : wei);
  const { whole, fraction } = splitUnits(rounded, monDecimals);
  const trimmed = fraction.replace(/0+$/, "");
  return `${groupThousands(whole)}${trimmed ? `.${trimmed}` : ""}${nbsp}MON`;
};

export const formatFeeEstimate = (wei: bigint) => `about ${formatMonFee(wei)}`;

const percentFromBps = (bps: number) => {
  if (!Number.isInteger(bps) || bps < 0)
    throw new RangeError(`Invalid basis points: ${String(bps)}`);
  const whole = Math.floor(bps / 100);
  const fraction = String(bps % 100)
    .padStart(2, "0")
    .replace(/0+$/, "");
  return fraction ? `${String(whole)}.${fraction}` : String(whole);
};

export const formatBps = (bps: number) => `${percentFromBps(bps)}%`;

export const formatBpsTechnical = (bps: number) => `${String(bps)} bps (${formatBps(bps)})`;

export const formatSplit = (weightsBps: readonly number[]) =>
  weightsBps.map(percentFromBps).join("/");

export const formatPercentRange = (lowBps: number, highBps: number) =>
  `${percentFromBps(lowBps)}–${percentFromBps(highBps)}%`;
