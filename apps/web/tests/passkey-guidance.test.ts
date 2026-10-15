import { afterEach, describe, expect, it, vi } from "vitest";
import { MeraError } from "@category-labs/mera";
import { passkeyAvailability, passkeyFailure } from "../src/lib/accounts/passkey-guidance";
import { afterAuthPath, authHref } from "../src/lib/routes";
afterEach(() => vi.unstubAllGlobals());
describe("passkey onboarding guidance", () => {
  it("fails gracefully in insecure and unsupported browsers without attempting a ceremony", () => {
    vi.stubGlobal("isSecureContext", false);
    expect(passkeyAvailability()).toContain("secure browser");
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("PublicKeyCredential", undefined);
    expect(passkeyAvailability()).toContain("continue with email");
  });
  it("does not promise PRF support based on WebAuthn availability", () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("PublicKeyCredential", {});
    vi.stubGlobal("navigator", { credentials: {} });
    expect(passkeyAvailability()).toBe("available");
    expect(passkeyFailure(new MeraError("PRF_UNAVAILABLE", "raw provider error"))).toContain(
      "original passkey",
    );
  });
  it("explains aborted ceremonies and preserves the campaign context through new-account onboarding", () => {
    expect(passkeyFailure(new MeraError("PASSKEY_OPERATION_FAILED", "closed"))).toContain("closed");
    const next = "/c/3/network?node=7&sale=6";
    expect(
      new URL(authHref("signup", { next }), "https://usespoke.xyz").searchParams.get("next"),
    ).toBe(next);
    expect(
      new URL(
        afterAuthPath({ isNewAccount: true, next, intent: "earn" }),
        "https://usespoke.xyz",
      ).searchParams.get("next"),
    ).toBe(next);
    expect(afterAuthPath({ isNewAccount: false, next, intent: "earn" })).toBe(next);
  });
});
