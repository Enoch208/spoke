import { normalizeWeights, splitReward } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import { previewCopy } from "./copy-preview";

const copy = previewCopy.how;
const weights = [5_000, 2_500, 1_500, 1_000];

export const referenceVectors = () => [
  {
    label: fill(copy.vectorReward, { reward: "1000" }),
    expected: "500/250/150/100",
    actual: splitReward(1_000n, weights).join("/"),
  },
  {
    label: fill(copy.vectorReward, { reward: "1001" }),
    expected: "501/250/150/100",
    actual: splitReward(1_001n, weights).join("/"),
  },
  {
    label: fill(copy.vectorReward, { reward: "1" }),
    expected: "1/0/0/0",
    actual: splitReward(1n, weights).join("/"),
  },
  {
    label: copy.vectorTwo,
    expected: "6667/3333",
    actual: normalizeWeights([5_000, 2_500]).join("/"),
  },
];
