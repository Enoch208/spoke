export const signinFlow = {
  passkeyUnsupported: "This browser can’t use passkeys.",
  passkeyCancelled:
    "The passkey prompt was closed, timed out or blocked by the browser. Nothing was created or signed.",
  sessionRetry:
    "Your account is created on this device. We couldn’t reach Spoke to sign you in; retrying.",
  signRejected: "Sign-in cancelled",
  inAppBrowser: "For the smoothest sign-in, open this page in your browser.",
  accountChanged:
    "Your wallet switched to {address}. Sign in as this account, or switch back in your wallet.",
  noPasskey: "No Spoke passkey on this device? Create an account or recover one.",
  walletDisconnected: "Your wallet disconnected. Reconnect it to continue.",
} as const satisfies Record<string, string>;
