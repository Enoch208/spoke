import { accountInputs, accountPersonas } from "./inputs-account";
import { coreInputs, corePersonas } from "./inputs-core";
import { growthCoreInputs, growthCorePersonas } from "./inputs-growth-core";
import { growthPlusInputs, growthPlusPersonas } from "./inputs-growth-plus";
import { platformInputs, platformPersonas } from "./inputs-platform";
import type { MethodInputs, MethodPersonas } from "./inputs-types";

export const methodInputs: MethodInputs = {
  "funding.auroraConfig": {},
  "funding.auroraPreview": {
    originAsset: "sample-origin",
    destinationAsset: "sample-destination",
    amount: "1000000",
    refundAddress: "0x0000000000000000000000000000000000000001",
  },
  "funding.auroraCreateDeposit": {
    expectedRecipient: "0x0000000000000000000000000000000000000062",
    originAsset: "sample-origin",
    destinationAsset: "sample-destination",
    amount: "1000000",
    refundAddress: "0x0000000000000000000000000000000000000001",
    requestId: "e4d3199b-759c-440d-9058-a293b616d7a1",
    acknowledgeMainnet: true,
  },
  "funding.auroraDeposit": { id: "e4d3199b-759c-440d-9058-a293b616d7a1" },
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
