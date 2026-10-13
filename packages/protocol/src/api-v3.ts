import { z } from "zod";
import { getAddress } from "viem";
import { addressString, bytes32String, uintString } from "./api/common";
import { commissionPolicy } from "./policy";

export const walletAddress = addressString.transform((value) => getAddress(value));
export const resourceId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const handle = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z][a-z0-9_]+$/);
export const publicUrl = z
  .url()
  .refine((value) => new URL(value).protocol === "https:", "Use an HTTPS URL.");
export const accountKind = z.enum(["wallet", "passkey", "phrase"]);
export const challengeInput = z.strictObject({
  address: walletAddress,
  chainId: z.number().int(),
  accountKind: accountKind.default("wallet"),
  purpose: z.enum(["signIn", "link", "confirm"]).default("signIn"),
  action: z.string().min(1).max(80).optional(),
});
export const verifyInput = z.strictObject({
  message: z.string().min(1).max(4096),
  signature: z
    .string()
    .regex(/^0x[\da-fA-F]+$/)
    .max(16384),
  method: accountKind.default("wallet"),
});
export const profileUpdate = z.strictObject({
  displayName: z.string().max(80).optional(),
  handle: handle.optional(),
  avatarSeed: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  website: publicUrl.nullable().optional(),
  intent: z.enum(["buy", "earn", "sell"]).optional(),
  onboardingCompleted: z.boolean().optional(),
});
export const preferencesUpdate = z.strictObject({
  displayCurrency: z.enum(["SDUSD", "USD", "NGN", "EUR", "GBP"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  language: z.literal("en").optional(),
  startWorkspace: z.enum(["buy", "earn", "sell"]).optional(),
  earnChecklistHidden: z.boolean().optional(),
  sellChecklistHidden: z.boolean().optional(),
});
export const catalogCategories = ["digital", "education", "software", "design", "other"] as const;
export const merchantInput = z.strictObject({
  name: z.string().min(2).max(100),
  slug: handle,
  description: z.string().max(2000).default(""),
  website: publicUrl.nullable().default(null),
  supportEmail: z.email().max(200),
  region: z.string().min(2).max(80),
  agreementVersion: z.literal("1.0"),
  budgetAlertSales: z.number().int().min(1).max(50).default(5),
  logo: publicUrl.nullable().optional(),
  category: z.enum(catalogCategories).optional(),
  showSupportEmail: z.boolean().optional(),
});
export const merchantUpdate = merchantInput.partial().omit({ agreementVersion: true });
export const productInput = z.strictObject({
  merchantId: resourceId.optional(),
  title: z.string().min(2).max(150),
  summary: z.string().max(300),
  outcome: z.string().max(500).default(""),
  description: z.string().max(15000),
  category: z.enum(catalogCategories),
  priceBaseUnits: uintString.refine((value) => BigInt(value) > 0n && BigInt(value) < 2n ** 128n),
  token: walletAddress,
  images: z.array(publicUrl).max(8).default([]),
  fulfillmentMode: z.enum(["download", "external", "manual"]),
  deliverable: z.string().min(1).max(2048),
  refundPolicy: z.string().min(10).max(3000),
  coverAlt: z.string().max(140).optional(),
  accessTiming: z.enum(["afterPurchase", "afterHold"]).optional(),
  status: z.enum(["draft", "ready", "archived"]).optional(),
});
export const campaignDraftInput = z
  .strictObject({
    productId: resourceId.optional(),
    productVersion: z.number().int().positive().optional(),
    policy: commissionPolicy,
    endsAt: z.iso.datetime(),
    inviteOnly: z.boolean().default(false),
    stepReached: z.number().int().min(0).max(5),
    version: z.number().int().nonnegative(),
    mode: z.enum(["create", "newVersion"]),
    campaignId: z.union([uintString, z.string().regex(/^demo-[\w-]+$/)]).optional(),
    effectiveAt: z.iso.datetime().optional(),
    name: z.string().max(80).optional(),
    deposit: uintString.optional(),
    budgetAlertSales: z.number().int().min(1).max(50).optional(),
    endPreset: z.enum(["30d", "90d", "180d", "365d", "custom"]).optional(),
    refundTerms: z.string().max(500).optional(),
    regions: z
      .array(z.string().regex(/^[A-Z]{2}$/))
      .max(250)
      .optional(),
    disclosure: z.string().max(280).optional(),
    cohort: z.array(addressString).max(200).optional(),
    templateId: resourceId.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "create" && !value.productId)
      ctx.addIssue({
        code: "custom",
        message: "A new campaign requires a product.",
        path: ["productId"],
      });
    if (value.mode === "newVersion" && (!value.campaignId || !value.effectiveAt))
      ctx.addIssue({
        code: "custom",
        message: "New terms require a campaign and effective time.",
        path: ["campaignId"],
      });
  });
export const checkoutInputV3 = z.strictObject({
  campaignId: uintString,
  nodeId: uintString.default("0"),
  orderKey: bytes32String,
  expectedPrice: uintString,
  expectedReward: uintString,
  policyHash: bytes32String,
  chainId: z.number().int(),
});
export const visibilityInput = z
  .strictObject({
    level: z.enum(["public", "pseudonymous", "private"]),
    fields: z
      .array(
        z.enum([
          "settledConversions",
          "netAttributedValue",
          "merchantCount",
          "campaignCount",
          "refundAdjustment",
        ]),
      )
      .default([]),
    acceptsInvitations: z.boolean().default(false),
  })
  .refine(
    (value) => !value.fields.length || value.fields.includes("refundAdjustment"),
    "Performance visibility must include refund adjustment.",
  );
export const supportInput = z.strictObject({
  subject: z.string().min(3).max(150).optional(),
  category: z.enum(["abuse", "fraud", "product", "payment", "account", "other"]),
  message: z.string().min(20).max(5000),
  email: z.email().optional(),
  context: z.strictObject({
    page: z.string().min(1).max(2048),
    campaignId: resourceId.optional(),
    nodeId: resourceId.optional(),
    saleId: resourceId.optional(),
    merchantId: resourceId.optional(),
  }),
  target: z
    .strictObject({
      kind: z.enum(["campaign", "link", "merchant", "distributor", "sale"]),
      id: resourceId,
    })
    .optional(),
});
export const invitationInput = z.strictObject({
  distributor: walletAddress,
  campaignId: uintString,
  message: z.string().max(2000),
  terms: z.string().max(3000),
  expiresAt: z.iso.datetime(),
});
export const stepUpInput = z.strictObject({ confirmationToken: z.string().min(32).max(128) });
export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(100).optional(),
});
export const notificationPreferences = z.strictObject({
  sales: z.boolean().default(true),
  earnings: z.boolean().default(true),
  campaigns: z.boolean().default(true),
  invitations: z.boolean().default(true),
  account: z.boolean().default(true),
  toastsEnabled: z.boolean().default(true),
});
