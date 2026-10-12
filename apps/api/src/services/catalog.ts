import { z } from "zod";
import { campaignDraft, merchantOrg, merchantProfile, product, tokenInfo } from "@spoke/protocol";
import type { Store, StoredRecord } from "../db/store.js";
import { allRecords } from "./read-utils.js";

export const nativeToken = (address: unknown) =>
  tokenInfo.parse({
    address,
    symbol: "SDUSD",
    decimals: 6,
    name: "SpokeDemoUSD",
    testnet: true,
  });

export const productView = (row: StoredRecord, privateFields = false) =>
  product.parse({
    ...row.payload,
    outcome: row.payload.outcome ?? "",
    id: row.kind === "product-version" ? row.id.replace(/_\d+$/, "") : row.id,
    media: row.payload.media ?? [],
    token: nativeToken(row.payload.token),
    variants: row.payload.variants ?? [],
    billingPeriod: row.payload.billingPeriod ?? null,
    deliverable: privateFields ? row.payload.deliverable : undefined,
  });

export const merchantView = async (store: Store, row: StoredRecord, privateFields = false) => {
  const campaigns = await allRecords(
    store,
    "campaign",
    z.string().parse(row.payload.address).toLowerCase(),
  );
  const profile = {
    ...row.payload,
    id: row.id,
    logo: row.payload.logo ?? null,
    joinedAt: row.createdAt.toISOString(),
    offersCount: campaigns.length,
    closedAt: row.payload.closedAt ?? null,
  };
  if (!privateFields) return merchantProfile.parse(profile);
  const agreement = z
    .object({ version: z.string(), acceptedAt: z.string() })
    .parse(row.payload.agreement);
  return merchantOrg.parse({
    ...profile,
    defaults: row.payload.defaults ?? null,
    businessWallet: row.payload.address,
    agreement: {
      ...agreement,
      publishedAt: "2026-10-12T00:00:00.000Z",
      url: "https://usespoke.xyz/terms",
    },
  });
};

export const draftView = (row: StoredRecord) =>
  campaignDraft.parse({
    ...row.payload,
    draftId: row.id,
    savedAt: row.updatedAt.toISOString(),
  });
