import { sampleAddress } from "../../src/demo/world/ids";
import { MERCHANT_SAMPLE_WALLET, credentialIdOf } from "../../src/demo/world/seed-accounts-parts";
import type { MethodInputs, MethodPersonas } from "./inputs-types";

const confirmationToken = "c".repeat(64);
const signature = `0x${"ab".repeat(65)}`;
const merchantMain = sampleAddress("merchant-a:main");
const merchantBusiness = sampleAddress("merchant-a:business");
const addedPasskey = credentialIdOf("mara:added");

export const accountInputs = {
  "auth.challenge": {
    address: merchantMain,
    chainId: 10143,
    accountKind: "passkey",
    purpose: "confirm",
    action: "Export your data",
  },
  "auth.verify": {
    message: "usespoke.xyz wants you to sign in with your account:\nPurpose: signIn",
    signature,
    method: "passkey",
  },
  "auth.signOut": {},
  "account.me": {},
  "account.updateProfile": {
    displayName: "Rhea Castillo",
    bio: "Templates for independent studios.",
  },
  "account.handleAvailable": { handle: "rhea" },
  "account.activity": { address: merchantBusiness, filter: "campaigns", limit: 25 },
  "account.balances": { address: merchantBusiness },
  "account.recordRecoveryCheck": {},
  "account.passkeys": {},
  "account.addPasskey": {
    credentialId: "demo-new-credential-0001",
    kind: "added",
    transports: ["internal", "hybrid"],
    label: "Chrome on Mac",
    vault: { version: 1, ciphertext: "0xabcdef" },
    confirmationToken,
  },
  "account.updatePasskey": { credentialId: addedPasskey, label: "1Password · Work laptop" },
  "account.removePasskey": { credentialId: addedPasskey, confirmationToken },
  "account.passkeyVault": { credentialId: addedPasskey },
  "account.wallets": {},
  "account.linkWallet": {
    address: "0x1111111111111111111111111111111111111111",
    kind: "wallet",
    walletName: "MetaMask",
    label: "Travel wallet",
    linkSignature: signature,
    nonce: "a1b2c3d4e5f60718",
    confirmationToken,
  },
  "account.unlinkWallet": { address: MERCHANT_SAMPLE_WALLET, confirmationToken },
  "account.labelWallet": { address: merchantBusiness, label: "Northbeam business" },
  "account.setPayoutAddress": { address: merchantMain, confirmationToken },
  "account.sessions": {},
  "account.revokeSession": { sessionId: "demo-session-rhea-2" },
  "account.preferences": {},
  "account.updatePreferences": { displayCurrency: "EUR" },
  "account.exportData": { confirmationToken },
  "account.deleteAccount": { confirmationToken, typedConfirmation: "delete my account" },
  "funding.status": { address: merchantBusiness },
  "funding.requestGas": {},
  "notifications.list": { limit: 30 },
  "notifications.markRead": { all: true },
  "notifications.preferences": {},
  "notifications.updatePreferences": { earnings: false },
  "support.report": {
    category: "abuse",
    message: "This link copies another distributor's post word for word.",
    context: { page: "/c/demo-c-1", campaignId: "demo-c-1", nodeId: "demo-n-1-mara" },
    target: { kind: "link", id: "demo-n-1-mara" },
  },
  "support.contact": {
    subject: "Question about refunds",
    message: "How long does a refund take to show up in my wallet?",
    email: "sam@example.com",
  },
  "support.mine": {},
} satisfies MethodInputs;

export const accountPersonas = {
  "auth.challenge": "merchant",
  "auth.verify": "merchant",
  "account.me": "merchant",
  "account.passkeys": "distributor",
  "account.addPasskey": "distributor",
  "account.updatePasskey": "distributor",
  "account.removePasskey": "distributor",
  "account.wallets": "merchant",
  "account.linkWallet": "merchant",
  "account.unlinkWallet": "merchant",
  "account.setPayoutAddress": "merchant",
  "account.revokeSession": "merchant",
  "funding.status": "merchant",
  "funding.requestGas": "merchant",
  "notifications.list": "distributor",
  "notifications.markRead": "distributor",
  "support.report": "buyer",
  "support.contact": "buyer",
  "support.mine": "distributor",
} satisfies MethodPersonas;
