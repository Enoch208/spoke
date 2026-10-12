import { contractErrorCodes, errorCodes, type ContractErrorName } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { apiErrorCopy, contractErrorCopy } from "@/lib/copy/errors/resolve";

const contractNames = Object.keys(contractErrorCodes).filter((name): name is ContractErrorName =>
  Object.hasOwn(contractErrorCodes, name),
);

describe("apiErrorCopy", () => {
  it("has spec copy for every API error code except the ones the spec leaves without words", () => {
    const withoutCopy = errorCodes.filter((code) => apiErrorCopy(code).kind === "fallback");
    expect(withoutCopy).toEqual(["CAMPAIGN_FROZEN"]);
  });

  it("uses the client copy for a code the client also defines", () => {
    const resolved = apiErrorCopy("RATE_LIMITED");
    expect(resolved.kind).toBe("message");
    expect(resolved.kind === "message" && resolved.copy.title).toBe("Too many requests");
  });

  it("maps a missing feature to the feature-not-live copy", () => {
    const resolved = apiErrorCopy("FEATURE_NOT_AVAILABLE");
    expect(resolved.kind === "message" && resolved.copy.title).toBe("{featureName} isn’t live yet");
  });

  it("returns field lines for codes that the spec words as a single line", () => {
    expect(apiErrorCopy("HANDLE_RESERVED").kind).toBe("line");
  });
});

describe("contractErrorCopy", () => {
  it("resolves every contract error the protocol can revert with", () => {
    const unresolved = contractNames.filter((name) => contractErrorCopy(name).kind === "fallback");
    expect(unresolved).toEqual([]);
  });

  it("prefers the contract-specific row over the code copy", () => {
    const resolved = contractErrorCopy("CampaignActive");
    expect(resolved.kind === "message" && resolved.copy.title).toBe("Pause the campaign first");
  });

  it("falls back to the code copy for contract errors without their own row", () => {
    const resolved = contractErrorCopy("PolicyMismatch");
    expect(resolved.kind === "message" && resolved.copy.title).toBe("The campaign terms changed");
  });
});
