import type { PartialHandlers } from "../handler";
import { fail } from "../handler";

const unavailable = () =>
  fail(
    "FEATURE_NOT_AVAILABLE",
    "Mainnet wallet funding is available only in Live mode. Demo never creates real deposit instructions.",
  );

export const auroraReads = {
  "funding.auroraConfig": () => ({
    provider: "aurora",
    configured: false,
    destinationChainId: 143,
    destinationNetwork: "Monad Mainnet",
    sources: [],
    destinations: [],
  }),
  "funding.auroraDeposit": unavailable,
} satisfies PartialHandlers<"funding">;

export const auroraWrites = {
  "funding.auroraPreview": unavailable,
  "funding.auroraCreateDeposit": unavailable,
} satisfies PartialHandlers<"funding">;
