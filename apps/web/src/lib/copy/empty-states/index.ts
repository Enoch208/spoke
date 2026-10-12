import { buyEmptyStates } from "./buy";
import { earnEmptyStates } from "./earn";
import { platformEmptyStates } from "./platform";
import { publicEmptyStates } from "./public";
import { sellEmptyStates } from "./sell";
import type { EmptyStateCopy } from "./shape";

export type { EmptyStateCopy, EmptyStateIllustration } from "./shape";

export const emptyStates = {
  ...publicEmptyStates,
  ...earnEmptyStates,
  ...buyEmptyStates,
  ...sellEmptyStates,
  ...platformEmptyStates,
} as const satisfies Record<`ES-${string}`, EmptyStateCopy>;
