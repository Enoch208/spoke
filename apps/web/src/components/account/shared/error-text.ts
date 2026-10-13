import { isClientError } from "@/lib/client/errors";
import { sharedCopy } from "../copy/shared";
import { ceremonyFailure } from "./outcome";

export const errorText = (failure: unknown) => {
  if (isClientError(failure)) return failure.message;
  const kind = ceremonyFailure(failure);
  if (kind === "cancelled") return sharedCopy.stepUp.cancelled;
  if (kind === "prf") return `${sharedCopy.ceremony.prf} ${sharedCopy.ceremony.prfOrphan}`;
  if (kind === "crypto") return sharedCopy.ceremony.crypto;
  return sharedCopy.ceremony.failed;
};
