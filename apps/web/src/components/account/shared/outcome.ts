import { isMeraError } from "@category-labs/mera";

export type CeremonyFailure = "cancelled" | "prf" | "crypto" | "failed";

export class CeremonyError extends Error {
  readonly failure: CeremonyFailure;
  constructor(failure: CeremonyFailure) {
    super(failure);
    this.failure = failure;
  }
}

const rejectedInWallet = (error: unknown) =>
  error instanceof Error &&
  (error.name === "UserRejectedRequestError" || /reject|denied|cancel/i.test(error.message));

export const ceremonyFailure = (error: unknown): CeremonyFailure => {
  if (error instanceof CeremonyError) return error.failure;
  if (isMeraError(error)) {
    if (error.code === "PRF_UNAVAILABLE") return "prf";
    if (error.code === "CRYPTO_UNAVAILABLE") return "crypto";
    if (error.code === "PASSKEY_OPERATION_FAILED") return "cancelled";
    return "failed";
  }
  return rejectedInWallet(error) ? "cancelled" : "failed";
};
