import type { ErrorMessage } from "../types";

export const errorFallbacks = {
  undecodableRevert: {
    title: "The contract rejected this",
    body: "We couldn’t read the reason. Only the network fee was used.",
    recovery: ["Report a problem"],
    retryable: "no",
  },
  unknownApiCode: {
    title: "Something went wrong on our side",
    body: "Try again. If it keeps happening, report it with reference {requestId}.",
    recovery: ["Try again"],
    retryable: "yes",
  },
  unknownWalletError: {
    title: "Your wallet returned an error",
    body: "Nothing was sent. Try again, or check your wallet for details.",
    recovery: ["Try again"],
    retryable: "yes",
  },
} as const satisfies Record<string, ErrorMessage>;

export const requestReference = "Reference {requestId}";

export const networkFailure =
  "You’re offline or Spoke is unreachable. Check your connection and try again.";
