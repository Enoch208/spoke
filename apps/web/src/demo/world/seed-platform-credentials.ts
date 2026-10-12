import type { Address } from "viem";
import { DAY, demoId, iso, sampleAddress, sampleHash } from "./ids";
import type { DemoCore, DemoSale } from "./types";
import type { Credential } from "./world";

export const CREDENTIAL_ISSUER = sampleAddress("credential-issuer");
export const CREDENTIAL_TERM = 90 * DAY;
export const SEEDED_CREDENTIALS = 2;

const DEMO_MARK = "64656d6f";

type Metrics = Credential["metrics"];

const owns = (addresses: readonly string[], address: string) =>
  addresses.some((candidate) => candidate.toLowerCase() === address.toLowerCase());

export const addressesBehind = (core: DemoCore, subject: string): string[] =>
  core.people.find((person) => owns(person.addresses, subject))?.addresses ?? [subject];

const onPath = (sale: DemoSale, addresses: readonly string[]) =>
  sale.allocations.filter((allocation) => owns(addresses, allocation.owner));

const within = (at: number | null, from: number, to: number): at is number =>
  at !== null && at >= from && at <= to;

export const settledEvidence = (
  core: DemoCore,
  addresses: readonly string[],
  from: number,
  to: number,
) =>
  core.sales.filter(
    (sale) =>
      sale.status === "FINALIZED" &&
      within(sale.finalizedAt, from, to) &&
      onPath(sale, addresses).length > 0,
  );

export const evidenceRootOf = (core: DemoCore, subject: string, from: number, to: number) => {
  const ids = settledEvidence(core, addressesBehind(core, subject), from, to).map(
    (sale) => sale.id,
  );
  return sampleHash(`credential-evidence:${subject.toLowerCase()}:${ids.join(",")}`);
};

export const metricsOf = (core: DemoCore, subject: string, from: number, to: number): Metrics => {
  const addresses = addressesBehind(core, subject);
  const settled = settledEvidence(core, addresses, from, to);
  const campaigns = new Set(settled.map((sale) => sale.campaignId));
  const merchants = new Set(
    core.campaigns
      .filter((campaign) => campaigns.has(campaign.id))
      .map((campaign) => campaign.merchantId),
  );
  const refunded = core.sales.filter(
    (sale) =>
      sale.status === "REFUNDED" &&
      within(sale.refundedAt, from, to) &&
      onPath(sale, addresses).length > 0,
  );
  return {
    settledConversions: settled.reduce((count, sale) => count + onPath(sale, addresses).length, 0),
    netAttributedValue: settled.reduce((sum, sale) => sum + sale.price, 0n).toString(),
    merchantCount: merchants.size,
    campaignCount: campaigns.size,
    refundAdjustment: refunded.reduce((sum, sale) => sum + sale.price, 0n).toString(),
  };
};

const metricsKey = (metrics: Metrics) =>
  [
    metrics.settledConversions,
    metrics.netAttributedValue,
    metrics.merchantCount,
    metrics.campaignCount,
    metrics.refundAdjustment,
  ].join("|");

export const issuerSignatureOf = (
  credential: Omit<Credential, "issuerSignature" | "holderSignature" | "status">,
) =>
  `0x${DEMO_MARK}${sampleHash(
    `credential-issuer:${credential.id}:${credential.subject.toLowerCase()}:${credential.issuedAt}:${credential.expiresAt}:${credential.evidencePeriod.from}:${credential.evidencePeriod.to}:${credential.evidenceRoot}:${metricsKey(credential.metrics)}`,
  ).slice(2)}`;

export const holderSignatureOf = (
  credential: Pick<Credential, "id" | "subject" | "evidenceRoot">,
) =>
  `0x${DEMO_MARK}${sampleHash(
    `credential-holder:${credential.subject.toLowerCase()}:${credential.id}:${credential.evidenceRoot}`,
  ).slice(2)}`;

export interface IssueRequest {
  id: string;
  subject: Address;
  issuedAt: number;
  from: number;
  expiresAt: number;
  status: Credential["status"];
}

export const issueCredential = (core: DemoCore, request: IssueRequest): Credential => {
  const unsigned = {
    id: request.id,
    issuer: CREDENTIAL_ISSUER,
    subject: request.subject,
    issuedAt: iso(request.issuedAt),
    evidencePeriod: { from: iso(request.from), to: iso(request.issuedAt) },
    expiresAt: iso(request.expiresAt),
    metrics: metricsOf(core, request.subject, request.from, request.issuedAt),
    evidenceRoot: evidenceRootOf(core, request.subject, request.from, request.issuedAt),
  };
  return {
    ...unsigned,
    issuerSignature: issuerSignatureOf(unsigned),
    holderSignature: holderSignatureOf(unsigned),
    status: request.status,
  };
};

export const seedCredentials = (core: DemoCore): Credential[] => {
  const holder = core.people.find((person) => person.id === core.personas.distributor);
  const subject = holder?.addresses[0];
  if (!holder || !subject) return [];
  const revokedAt = core.anchor - 40 * DAY;
  const activeAt = core.anchor - 10 * DAY;
  return [
    issueCredential(core, {
      id: demoId("cred", 1),
      subject,
      issuedAt: revokedAt,
      from: revokedAt - 90 * DAY,
      expiresAt: revokedAt + CREDENTIAL_TERM,
      status: "revoked",
    }),
    issueCredential(core, {
      id: demoId("cred", 2),
      subject,
      issuedAt: activeAt,
      from: holder.joinedAt,
      expiresAt: activeAt + CREDENTIAL_TERM,
      status: "active",
    }),
  ];
};
