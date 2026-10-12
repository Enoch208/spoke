import { handle as handleSchema, type ClientOutput } from "@spoke/protocol";
import { DAY, iso } from "../../../../demo/world/ids";
import { when } from "../../../../demo/world/seed-accounts-copy";
import type { DemoAccount, DemoWorld } from "../../../../demo/world/world";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import { personById } from "../views/basics";
import { merchantOrgWire, merchantsOwnedBy } from "../views/merchant-org";
import { accountOf, isoOrNull, signerOf } from "./account-store";

type Me = ClientOutput<"account.me">;
type HandleReason = ClientOutput<"account.handleAvailable">["reason"];

export const HANDLE_LOCK_MS = 30 * DAY;

export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "admin",
  "spoke",
  "support",
  "help",
  "root",
  "api",
  "demo",
  "sample",
  "official",
  "team",
]);

export const meOf = (world: DemoWorld, account: DemoAccount, now: number): Me => {
  const { profile } = account;
  const workspaces = merchantsOwnedBy(world, account.personId).map((merchant) =>
    merchantOrgWire(world, merchant, now),
  );
  return {
    address: signerOf(account).address,
    accountKind: profile.accountKind,
    handle: profile.handle,
    displayName: profile.displayName,
    avatarSeed: profile.avatarSeed,
    bio: profile.bio,
    website: profile.website,
    onboarding: { intent: profile.intent, completedAt: isoOrNull(profile.onboardingCompletedAt) },
    recovery: { checkedAt: isoOrNull(profile.recoveryCheckedAt) },
    handleChangedAt: isoOrNull(profile.handleChangedAt),
    handleChangeAvailableAt: isoOrNull(
      profile.handleChangedAt === null ? null : profile.handleChangedAt + HANDLE_LOCK_MS,
    ),
    payoutAddress: profile.payoutAddress,
    workspaces,
    isMerchant: workspaces.length > 0,
    isOperator: profile.isOperator,
    createdAt: iso(profile.createdAt),
  };
};

const isTaken = (world: DemoWorld, personId: string, candidate: string): boolean =>
  world.people.some(
    (person) =>
      person.id !== personId &&
      person.handle !== null &&
      (person.handle === candidate || person.handle.replace(/^demo-/, "") === candidate),
  );

export const handleReason = (
  world: DemoWorld,
  personId: string,
  candidate: string,
): HandleReason => {
  if (!handleSchema.safeParse(candidate).success) return "invalid";
  if (RESERVED_HANDLES.has(candidate)) return "reserved";
  return isTaken(world, personId, candidate) ? "taken" : null;
};

export const suggestionsFor = (world: DemoWorld, personId: string, candidate: string): string[] => {
  const base = candidate.replace(/[^a-z0-9_]/g, "").slice(0, 20);
  if (!base) return [];
  return [
    `${base}2`,
    `${base}_shares`,
    `${base}_hq`,
    `its_${base}`,
    `${base}_${String(base.length)}`,
  ]
    .filter((option) => handleReason(world, personId, option) === null)
    .slice(0, 3);
};

const checked = (value: string, limit: number, message: string): string => {
  const trimmed = value.trim();
  return trimmed.length > limit ? fail("VALIDATION_FAILED", message) : trimmed;
};

const nextHandle = (
  world: DemoWorld,
  account: DemoAccount,
  wanted: string,
  now: number,
): string => {
  const reason = handleReason(world, account.personId, wanted);
  if (reason === "reserved") fail("HANDLE_RESERVED", "That handle is reserved.");
  if (reason === "taken")
    fail("HANDLE_TAKEN", `Someone just took @${wanted}.`, {
      suggestions: suggestionsFor(world, account.personId, wanted),
    });
  const changedAt = account.profile.handleChangedAt;
  if (account.profile.handle !== null && changedAt !== null && now < changedAt + HANDLE_LOCK_MS)
    fail(
      "HANDLE_CHANGE_TOO_SOON",
      `You changed your handle on ${when(changedAt)}. You can change it again on ${when(changedAt + HANDLE_LOCK_MS)}.`,
    );
  return wanted;
};

const updateProfile = (
  input: DemoInput<"account.updateProfile">,
  world: DemoWorld,
  account: DemoAccount,
  now: number,
) => {
  const { profile } = account;
  const person = found(personById(world, account.personId), "Your profile");
  const wanted = input.handle;
  const handle =
    wanted === undefined || wanted === profile.handle
      ? profile.handle
      : nextHandle(world, account, wanted, now);
  const handleChanges = handle !== profile.handle;
  const displayName =
    input.displayName === undefined
      ? profile.displayName
      : checked(input.displayName, 40, "Use up to 40 characters for your name.");
  const bio =
    input.bio === undefined
      ? profile.bio
      : checked(input.bio, 160, "Keep your bio to 160 characters.");
  const website =
    input.website === undefined
      ? profile.website
      : input.website === null
        ? null
        : checked(input.website, 100, "Use a web address of up to 100 characters.");
  if (handleChanges && profile.handle !== null) profile.handleChangedAt = now;
  profile.handle = handle;
  profile.displayName = displayName;
  profile.bio = bio;
  profile.website = website;
  if (input.avatarSeed !== undefined) profile.avatarSeed = input.avatarSeed;
  if (input.intent !== undefined) profile.intent = input.intent;
  if (input.onboardingCompleted !== undefined)
    profile.onboardingCompletedAt = input.onboardingCompleted
      ? (profile.onboardingCompletedAt ?? now)
      : null;
  person.handle = handle;
  person.displayName = displayName;
  person.bio = bio;
  person.website = website;
};

export const profileReads = {
  "account.me": (_input, runtime) => meOf(runtime.world, accountOf(runtime), runtime.now()),
  "account.handleAvailable": (input, runtime) => {
    const personId = runtime.personaId();
    const own = accountOf(runtime).profile.handle === input.handle;
    const reason = own ? null : handleReason(runtime.world, personId, input.handle);
    const suggestions =
      reason === "taken" || reason === "reserved"
        ? suggestionsFor(runtime.world, personId, input.handle)
        : [];
    return { available: reason === null, reason, suggestions };
  },
} satisfies PartialHandlers<"account">;

export const profileWrites = {
  "account.updateProfile": (input, runtime) => {
    const account = accountOf(runtime);
    updateProfile(input, runtime.world, account, runtime.now());
    return meOf(runtime.world, account, runtime.now());
  },
  "account.recordRecoveryCheck": (_input, runtime) => {
    const account = accountOf(runtime);
    if (account.profile.accountKind === "wallet")
      fail(
        "NOT_ELIGIBLE",
        "Your wallet manages its own recovery. Spoke never holds a recovery phrase for wallet accounts.",
      );
    account.profile.recoveryCheckedAt = runtime.now();
    return { checkedAt: iso(runtime.now()) };
  },
} satisfies PartialHandlers<"account">;
