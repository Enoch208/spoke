import { isMeraError } from "@category-labs/mera";

export const passkeyAvailability = () => {
  if (!globalThis.isSecureContext)
    return "Use a secure browser tab at usespoke.xyz to continue with a passkey.";
  if (
    typeof PublicKeyCredential === "undefined" ||
    typeof navigator.credentials === "undefined" ||
    typeof globalThis.crypto === "undefined" ||
    typeof globalThis.crypto.subtle === "undefined"
  )
    return "Passkeys are unavailable in this browser. Open Spoke in a current browser, or continue with email.";
  return "available";
};
export const passkeyFailure = (failure: unknown) => {
  if (isMeraError(failure)) {
    if (failure.code === "PRF_UNAVAILABLE")
      return "This passkey provider cannot unlock Spoke’s account and private workspace keys. Try a PRF-capable password manager or your phone, or continue with email. Existing notes still need their original passkey.";
    if (failure.code === "PASSKEY_OPERATION_FAILED")
      return "The passkey prompt was closed, timed out or could not run here. Try again in your browser. To restore an existing account, choose its original passkey rather than creating a new one.";
    if (failure.code === "CRYPTO_UNAVAILABLE")
      return "Open https://usespoke.xyz in a current browser with a secure connection, then try again.";
    if (failure.code === "DECRYPT_FAILED")
      return "This passkey could not unlock the saved account. Choose the original passkey or use account recovery.";
  }
  return failure instanceof Error && failure.message
    ? failure.message
    : "Passkey sign-in did not finish. Try again or use your original account’s recovery option.";
};
