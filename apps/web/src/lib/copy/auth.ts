export const authCopy = {
  signup: {
    title: "Create your Spoke account",
    subtitle: "One account to share, earn, buy and sell. No password, no seed phrase to type.",
    passkey: "Create account with passkey",
    switchPrompt: "Already have an account?",
    switchAction: "Log in",
  },
  login: {
    title: "Welcome back",
    subtitle: "Continue with the email, passkey or wallet you used before.",
    passkey: "Continue with passkey",
    switchPrompt: "New to Spoke?",
    switchAction: "Create an account",
    recover: "Lost your passkey? Recover your account",
  },
  passkeyHint:
    "Passkeys use Face ID, Touch ID or a security key, and stay on your device. Spoke never sees them.",
  divider: "or use a wallet",
  email: "Continue with email",
  emailHint: "Get a one-time code. No wallet extension needed. Email sign-in is powered by Reown.",
  connectedWallet: "Continue with connected wallet",
  walletConnect: "More wallets",
  walletConnectHint: "WalletConnect",
  working: {
    passkey: "Waiting for your passkey…",
    wallet: "Waiting for your wallet…",
    email: "Complete email verification and confirm your sign-in…",
  },
  demo: "Just looking? Try the demo with sample data",
  legalLead: "By continuing you agree to the",
  legalJoin: "and",
  terms: "Terms",
  privacy: "Privacy notice",
  panel: {
    eyebrow: "Open distribution protocol on Monad Testnet",
    title: "Pay for revenue, not reach.",
    points: [
      "Rewards come from a merchant’s funded budget and are only paid on settled sales.",
      "Every split is disclosed up front and recorded onchain with the sale.",
      "Start with email, a passkey or your wallet. Spoke never holds your money.",
    ],
  },
} as const;
