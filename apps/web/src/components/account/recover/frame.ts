import type { FlowArt } from "../flow/flow-frame";

export type Frame = {
  id: string;
  steps: readonly string[];
  current: number;
  art: FlowArt;
  promise: string;
  back: (() => void) | undefined;
  backLabel: string;
};
