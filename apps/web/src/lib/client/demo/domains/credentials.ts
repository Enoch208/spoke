import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { demoId } from "../../../../demo/world/ids";
import {
  CREDENTIAL_ISSUER,
  CREDENTIAL_TERM,
  SEEDED_CREDENTIALS,
  evidenceRootOf,
  holderSignatureOf,
  issueCredential,
  issuerSignatureOf,
  metricsOf,
} from "../../../../demo/world/seed-platform-credentials";
import type { Credential } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { addressesOf, personById } from "../views/basics";

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const statusAt = (credential: Credential, now: number): Credential["status"] =>
  credential.status === "active" && Date.parse(credential.expiresAt) <= now
    ? "expired"
    : credential.status;

const credentialWire = (credential: Credential, now: number): Credential => ({
  ...credential,
  evidencePeriod: { ...credential.evidencePeriod },
  metrics: { ...credential.metrics },
  status: statusAt(credential, now),
});

const mine = (runtime: DemoRuntime) => {
  const addresses = addressesOf(runtime.world, runtime.personaId());
  return runtime.world.credentials.filter((credential) =>
    addresses.some((address) => sameAddress(address, credential.subject)),
  );
};

export const credentialsReads = {
  "reputation.credentials": (_input, runtime) =>
    mine(runtime)
      .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
      .map((credential) => credentialWire(credential, runtime.now())),
  "reputation.verifyCredential": (input, runtime) => {
    const { world } = runtime;
    const credential = input.credential;
    const record = world.credentials.find((candidate) => candidate.id === credential.id);
    const from = Date.parse(credential.evidencePeriod.from);
    const to = Date.parse(credential.evidencePeriod.to);
    const checks = {
      issuerSignature:
        sameAddress(credential.issuer, CREDENTIAL_ISSUER) &&
        sameAddress(credential.issuerSignature, issuerSignatureOf(credential)),
      holderSignature: sameAddress(credential.holderSignature, holderSignatureOf(credential)),
      revocation: record !== undefined && record.status !== "revoked",
      expiry: Date.parse(credential.expiresAt) > runtime.now(),
      evidenceRoot: sameAddress(
        credential.evidenceRoot,
        evidenceRootOf(world, credential.subject, from, to),
      ),
    };
    return { valid: Object.values(checks).every(Boolean), checks };
  },
} satisfies PartialHandlers<"reputation">;

export const credentialsWrites = {
  "reputation.exportCredential": (_input, runtime) => {
    const { world } = runtime;
    const now = runtime.now();
    const holder = found(personById(world, runtime.personaId()), "Your account");
    const subject = holder.addresses[0];
    if (!subject)
      return fail("NOT_ELIGIBLE", "Your account has no address to bind a credential to.");
    if (metricsOf(world, subject, holder.joinedAt, now).settledConversions === 0)
      fail(
        "NOT_ELIGIBLE",
        "Nothing to put in a credential yet. Credentials include only finalized, non-refunded sales.",
      );
    const credential = issueCredential(world, {
      id: demoId("cred", SEEDED_CREDENTIALS + runtime.nextId("cred")),
      subject,
      issuedAt: now,
      from: holder.joinedAt,
      expiresAt: now + CREDENTIAL_TERM,
      status: "active",
    });
    world.credentials.push(credential);
    return credentialWire(credential, now);
  },
  "reputation.revokeCredential": (input, runtime) => {
    const credential = found(
      mine(runtime).find((candidate) => candidate.id === input.id),
      "This credential",
    );
    if (credential.status === "revoked") fail("CONFLICT", "This credential is already revoked.");
    credential.status = "revoked";
    return credentialWire(credential, runtime.now());
  },
} satisfies PartialHandlers<"reputation">;
