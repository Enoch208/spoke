import {
  allocatePolicyReward,
  computeReward,
  type ClientOutput,
  type CommissionPolicy,
} from "@spoke/protocol";
import { cx } from "@/components/ui/cx";
import { KeyValue } from "@/components/ui/key-value";
import { fill } from "@/lib/copy";
import {
  formatAmount,
  formatBps,
  formatDuration,
  formatSplit,
  shortHash,
  type TokenLike,
} from "@/lib/format";
import { policyCopy } from "../copy/links";

export type PolicyVersion = ClientOutput<"campaigns.policy">["current"];

export const toPolicy = (version: PolicyVersion): CommissionPolicy => ({
  rewardToken: version.rewardToken,
  commissionBps: version.commissionBps,
  perSaleCap: version.perSaleCap,
  campaignLiabilityCap: version.campaignLiabilityCap,
  maxRewardedAncestors: version.maxRewardedAncestors,
  weightsBps: version.weightsBps,
  shortPathMode: version.shortPathMode,
  holdSeconds: version.holdSeconds,
  expiry: version.expiry,
  eligibilityHash: version.eligibilityHash,
});

export const rewardFor = (price: bigint, version: PolicyVersion) =>
  computeReward(price, version.commissionBps, BigInt(version.perSaleCap));

export const splitFor = (price: bigint, version: PolicyVersion, pathLength: number) =>
  allocatePolicyReward(rewardFor(price, version), toPolicy(version), pathLength);

export const rateLine = (version: PolicyVersion, token: TokenLike) =>
  fill(policyCopy.rate, {
    pct: formatBps(version.commissionBps),
    cap: formatAmount(BigInt(version.perSaleCap), token),
  });

export const levelsLine = (version: PolicyVersion) =>
  version.weightsBps.length === 1
    ? policyCopy.oneLevel
    : fill(policyCopy.levels, {
        n: String(version.weightsBps.length),
        split: formatSplit(version.weightsBps),
      });

export const holdLine = (version: PolicyVersion) =>
  fill(policyCopy.hold, { hold: formatDuration(version.holdSeconds) });

const tints = [
  "bg-olive",
  "bg-chart-depth-4",
  "bg-chart-depth-3",
  "bg-chart-depth-2",
  "bg-chart-depth-1",
];

export function WeightsBar({
  weights,
  className,
}: {
  weights: readonly number[];
  className?: string;
}) {
  return (
    <div className={cx("grid gap-1.5", className)}>
      <div
        role="img"
        aria-label={`${policyCopy.weightsLabel}: ${weights.map(formatBps).join(", ")}`}
        className="flex h-2 w-full overflow-hidden rounded-full"
      >
        {weights.map((weight, index) => (
          <span
            key={index}
            className={cx(
              "h-full border-r-2 border-surface last:border-r-0",
              tints[index] ?? "bg-faint",
            )}
            style={{ width: `${String(weight / 100)}%` }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="text-subtle flex text-xs">
        {weights.map((weight, index) => (
          <span key={index} className="truncate" style={{ width: `${String(weight / 100)}%` }}>
            {fill(policyCopy.levelShort, { n: String(index + 1) })} {formatBps(weight)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PolicySummary({
  version,
  token,
  compact = false,
}: {
  version: PolicyVersion;
  token: TokenLike;
  compact?: boolean;
}) {
  if (compact)
    return (
      <div className="grid gap-2 text-sm">
        <p className="text-ink font-medium">{rateLine(version, token)}</p>
        <p className="text-body">
          {levelsLine(version)} · {holdLine(version)}
        </p>
        <WeightsBar weights={version.weightsBps} />
      </div>
    );
  return (
    <div className="grid gap-3">
      <WeightsBar weights={version.weightsBps} />
      <KeyValue
        items={[
          { key: "rate", label: policyCopy.labels.rate, value: rateLine(version, token) },
          { key: "levels", label: policyCopy.labels.levels, value: levelsLine(version) },
          { key: "hold", label: policyCopy.labels.hold, value: holdLine(version) },
          {
            key: "short",
            label: policyCopy.labels.short,
            value:
              version.shortPathMode === "RENORMALIZE_EXISTING"
                ? policyCopy.shortRenormalize
                : policyCopy.shortReturn,
          },
          {
            key: "version",
            label: fill(policyCopy.version, { version: String(version.version) }),
            value: shortHash(version.policyHash),
            mono: true,
          },
        ]}
      />
    </div>
  );
}
