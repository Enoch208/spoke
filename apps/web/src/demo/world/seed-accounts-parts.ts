import type { Address } from "viem";
import { DAY, MINUTE, demoId, iso, sampleAddress, sampleHash } from "./ids";
import type { DemoPerson } from "./types";
import type {
  DemoAccount,
  DemoProfile,
  DeviceSession,
  ExportJob,
  GasState,
  LinkedWallet,
  Passkey,
  Preferences,
} from "./world";

export const GAS_DRIP_WEI = 200_000_000_000_000_000n;
export const MERCHANT_SAMPLE_WALLET = sampleAddress("merchant-a:wallet");
export const SHOWN_FIELDS = [
  "settledConversions",
  "netAttributedValue",
  "merchantCount",
  "campaignCount",
  "refundAdjustment",
];

export const credentialIdOf = (key: string): string => sampleHash(`passkey:${key}`).slice(2, 46);

export const exportUrlOf = (jobId: string): string =>
  `https://usespoke.xyz/demo/exports/${jobId}.json`;

export const addressAt = (person: DemoPerson, index: number): Address => {
  const address = person.addresses[index];
  if (!address) throw new RangeError(`${person.id} has no address #${String(index + 1)}.`);
  return address;
};

type ProfileFields = Pick<
  DemoProfile,
  "intent" | "accountKind" | "payoutAddress" | "recoveryCheckedAt"
> &
  Partial<Pick<DemoProfile, "isOperator" | "shownFields">>;

export const profileOf = (person: DemoPerson, fields: ProfileFields): DemoProfile => ({
  handle: person.handle,
  displayName: person.displayName,
  avatarSeed: addressAt(person, 0).toLowerCase(),
  bio: person.bio,
  website: person.website,
  onboardingCompletedAt: person.joinedAt + 12 * MINUTE,
  handleChangedAt: null,
  createdAt: person.joinedAt,
  isOperator: false,
  shownFields: [],
  ...fields,
});

export const passkey = (
  key: string,
  label: string,
  kind: Passkey["kind"],
  deviceHint: string,
  createdAt: number,
  lastUsedAt: number,
): Passkey => ({
  credentialId: credentialIdOf(key),
  label,
  kind,
  deviceHint,
  createdAt: iso(createdAt),
  lastUsedAt: iso(lastUsedAt),
  hasVault: kind === "added",
});

interface Roles {
  payout?: boolean;
  signer?: boolean;
}

const linked = (
  base: Pick<LinkedWallet, "address" | "kind" | "derivationIndex" | "walletName" | "label">,
  linkedAt: number,
  roles: Roles,
): LinkedWallet => ({
  ...base,
  isPayout: roles.payout ?? false,
  isCurrentSigner: roles.signer ?? false,
  linkedAt: iso(linkedAt),
});

export const derivedAddress = (
  address: Address,
  index: number,
  label: string,
  linkedAt: number,
  roles: Roles = {},
): LinkedWallet =>
  linked(
    { address, kind: "passkey", derivationIndex: index, walletName: null, label },
    linkedAt,
    roles,
  );

export const walletAddress = (
  address: Address,
  walletName: string,
  label: string,
  linkedAt: number,
  roles: Roles = {},
): LinkedWallet =>
  linked({ address, kind: "wallet", derivationIndex: null, walletName, label }, linkedAt, roles);

export const session = (
  id: string,
  deviceLabel: string,
  method: DeviceSession["method"],
  signedInAt: number,
  lastActiveAt: number,
): DeviceSession => ({
  id: demoId("session", id),
  deviceLabel,
  method,
  signedInAt: iso(signedInAt),
  lastActiveAt: iso(lastActiveAt),
  expiresAt: iso(lastActiveAt + 30 * DAY),
  isCurrent: deviceLabel === "This browser",
});

export const preferences = (
  startWorkspace: Preferences["startWorkspace"],
  earnChecklistHidden: boolean,
): Preferences => ({
  displayCurrency: "SDUSD",
  theme: "light",
  language: "en",
  startWorkspace,
  earnChecklistHidden,
});

export const gas = (
  key: string,
  state: GasState["state"],
  lastDripAt: number | null,
): GasState => ({
  state,
  dripAmount: GAS_DRIP_WEI.toString(),
  lastDripAt: lastDripAt === null ? null : iso(lastDripAt),
  lastDripTxHash: lastDripAt === null ? null : sampleHash(`tx:gas:${key}`),
  nextEligibleAt: lastDripAt === null ? null : iso(lastDripAt + DAY),
});

export const exportJob = (id: string, at: number): ExportJob => {
  const jobId = demoId("export", id);
  return { jobId, status: "ready", url: exportUrlOf(jobId), expiresAt: iso(at + 15 * MINUTE) };
};

type Parts = Pick<
  DemoAccount,
  "profile" | "passkeys" | "wallets" | "sessions" | "preferences" | "gas"
> &
  Partial<Pick<DemoAccount, "exports">>;

export const accountFor = (person: DemoPerson, parts: Parts): DemoAccount => ({
  personId: person.id,
  notificationPreferences: {
    sales: true,
    earnings: true,
    campaigns: true,
    invitations: true,
    account: true,
    toastsEnabled: true,
  },
  notifications: [],
  support: [],
  activity: [],
  exports: [],
  ...parts,
});
