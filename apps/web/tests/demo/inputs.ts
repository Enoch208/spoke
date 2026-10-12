import { accountInputs, accountPersonas } from "./inputs-account";
import { coreInputs, corePersonas } from "./inputs-core";
import { growthCoreInputs, growthCorePersonas } from "./inputs-growth-core";
import { growthPlusInputs, growthPlusPersonas } from "./inputs-growth-plus";
import { platformInputs, platformPersonas } from "./inputs-platform";
import type { MethodInputs, MethodPersonas } from "./inputs-types";

export const methodInputs: MethodInputs = {
  ...coreInputs,
  ...accountInputs,
  ...growthCoreInputs,
  ...growthPlusInputs,
  ...platformInputs,
};

export const methodPersonas: MethodPersonas = {
  ...corePersonas,
  ...accountPersonas,
  ...growthCorePersonas,
  ...growthPlusPersonas,
  ...platformPersonas,
};
