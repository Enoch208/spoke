import { Coins01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAmount, type TokenLike } from "@/lib/format";
import { studioCopy } from "./copy";
import { Filled, Mono } from "./filled";
import type { TermsCheck } from "./validate";

export function RewardLine({
  check,
  token,
  showErrors,
}: {
  check: TermsCheck;
  token: TokenLike;
  showErrors: boolean;
}) {
  const reward = check.pricing?.rewardMinor ?? null;
  const error = check.errors.reward;
  if (error && (showErrors || reward === 0n))
    return (
      <p role="alert" className="bg-pink-soft text-pink-ink rounded-xl px-3 py-2.5 text-sm">
        {error}
      </p>
    );
  return (
    <p className="bg-soft text-ink flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm">
      <HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
      {reward === null ? (
        <span className="text-subtle">{studioCopy.commission.rewardPending}</span>
      ) : (
        <span>
          <Filled
            template={studioCopy.commission.rewardLine}
            values={{ reward: <Mono>{formatAmount(reward, token)}</Mono> }}
          />
        </span>
      )}
    </p>
  );
}
