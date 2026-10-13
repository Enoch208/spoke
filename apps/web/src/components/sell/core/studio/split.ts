import {
  BPS_DENOMINATOR,
  computeReward,
  simulatePolicy,
  type ClientOutput,
  type CommissionPolicy,
} from "@spoke/protocol";

export type SplitPreview = {
  readonly pathLength: number;
  readonly levels: number;
  readonly reward: bigint;
  readonly amounts: readonly bigint[];
  readonly weightsBps: readonly number[];
  readonly reserved: bigint;
  readonly returned: bigint;
  readonly remainder: bigint;
};

export const previewLengths = (levels: number): number[] =>
  levels === 3 || levels === 5 ? [1, 2, levels, 4].sort((a, b) => a - b) : [1, 2, 4];

export const splitPreview = (
  priceMinor: bigint,
  policy: CommissionPolicy,
  pathLength: number,
): SplitPreview => {
  const reward = computeReward(priceMinor, policy.commissionBps, BigInt(policy.perSaleCap));
  const split = simulatePolicy(priceMinor, policy, pathLength);
  const nearestWeight = split.weightsBps[0];
  const nearestShare =
    nearestWeight === undefined ? 0n : (reward * BigInt(nearestWeight)) / BPS_DENOMINATOR;
  return {
    pathLength,
    levels: policy.weightsBps.length,
    reward,
    amounts: split.amounts,
    weightsBps: split.weightsBps,
    reserved: split.reserved,
    returned: split.unallocated,
    remainder: (split.amounts[0] ?? 0n) - nearestShare,
  };
};

export type CrossCheck =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch"; readonly detail: readonly string[] }
  | { readonly kind: "unavailable" };

type Simulation = ClientOutput<"studio.simulate">["simulations"][number];

const sameSimulation = (local: SplitPreview, server: Simulation) =>
  server.amounts.length === local.amounts.length &&
  server.amounts.every((amount, index) => BigInt(amount) === local.amounts[index]) &&
  BigInt(server.reserved) === local.reserved &&
  BigInt(server.unallocated) === local.returned;

export const compareSimulations = (
  priceMinor: bigint,
  policy: CommissionPolicy,
  server: ClientOutput<"studio.simulate">,
): CrossCheck => {
  const detail = server.simulations
    .filter((simulation) => {
      const local = splitPreview(priceMinor, policy, simulation.pathLength);
      return !sameSimulation(local, simulation);
    })
    .map(
      (simulation) =>
        `path ${String(simulation.pathLength)}: server ${simulation.amounts.join("/")} returned ${simulation.unallocated}`,
    );
  return detail.length ? { kind: "mismatch", detail } : { kind: "match" };
};
