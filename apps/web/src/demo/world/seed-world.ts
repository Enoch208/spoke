import { seedCore } from "./seed";
import { seedAccounts } from "./seed-accounts";
import { seedGrowth } from "./seed-growth";
import { seedMerchantCore } from "./seed-merchant-core";
import { seedPlatform } from "./seed-platform";
import type { DemoWorld } from "./world";

export const seedWorld = (anchor: number): DemoWorld => {
  const core = seedCore(anchor);
  return {
    ...core,
    ...seedAccounts(core),
    ...seedMerchantCore(core),
    ...seedGrowth(core),
    ...seedPlatform(core),
    counters: {},
    lastChainActionAt: null,
  };
};
