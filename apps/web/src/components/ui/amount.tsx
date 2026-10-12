import { formatTokenAmount } from "@spoke/protocol";
import { testnetSuffix, type TokenLike } from "@/lib/format";
import { cx } from "./cx";

const sizes = {
  sm: "text-sm",
  base: "text-base",
  lead: "text-lead",
  h4: "text-h4",
  h3: "text-h3",
} as const;

const minus = "−";

export function Amount({
  amount,
  token,
  testnet = false,
  signed = false,
  size = "base",
  className,
}: {
  amount: bigint;
  token: TokenLike;
  testnet?: boolean;
  signed?: boolean;
  size?: keyof typeof sizes;
  className?: string | undefined;
}) {
  const negative = amount < 0n;
  const sign = signed && amount !== 0n ? (negative ? minus : "+") : negative ? minus : "";
  const digits = formatTokenAmount(negative ? -amount : amount, token.decimals);
  return (
    <span
      className={cx(
        "inline-flex flex-wrap items-baseline gap-x-1 font-mono tabular-nums",
        sizes[size],
        className,
      )}
    >
      <span className="whitespace-nowrap">{`${sign}${digits}`}</span>
      <span className="whitespace-nowrap">
        {token.symbol}
        {testnet ? <span className="font-ui text-subtle text-sm">{testnetSuffix}</span> : null}
      </span>
    </span>
  );
}
