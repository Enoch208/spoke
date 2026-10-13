import { afterAll, describe, expect, it, vi } from "vitest";
import { connectStore, type StoredRecord } from "../src/db/store.js";
import { merchantView } from "../src/services/catalog.js";

vi.mock("../src/services/read-utils.js", () => ({ allRecords: () => Promise.resolve([]) }));

const store = connectStore("postgresql://localhost:1/spoke-contact-test");
afterAll(() => store.close());

const merchant: StoredRecord = {
  kind: "merchant",
  id: "merchant-one",
  owner: "account-one",
  createdAt: new Date("2026-10-12T12:00:00Z"),
  updatedAt: new Date("2026-10-12T12:00:00Z"),
  payload: {
    name: "Sample merchant",
    slug: "sample_merchant",
    address: "0x0000000000000000000000000000000000000001",
    description: "Digital products",
    website: null,
    verificationTier: "unverified",
    supportEmail: "support@example.com",
    region: "NG",
    budgetAlertSales: 5,
    agreement: { version: "1.0", acceptedAt: "2026-10-12T12:00:00Z" },
  },
};

describe("merchant contact visibility", () => {
  it("omits the support email from public JSON until the merchant opts in", async () => {
    const profile = await merchantView(store, merchant);
    expect(JSON.stringify(profile)).not.toContain("support@example.com");
  });

  it("keeps an explicit opt-out private", async () => {
    const profile = await merchantView(store, {
      ...merchant,
      payload: { ...merchant.payload, showSupportEmail: false },
    });
    expect(profile.supportEmail).toBeUndefined();
  });

  it("publishes the contact email when the merchant opts in", async () => {
    const profile = await merchantView(store, {
      ...merchant,
      payload: { ...merchant.payload, showSupportEmail: true },
    });
    expect(profile.supportEmail).toBe("support@example.com");
  });

  it("keeps the email available in the owner's settings regardless of public visibility", async () => {
    const profile = await merchantView(
      store,
      { ...merchant, payload: { ...merchant.payload, showSupportEmail: false } },
      true,
    );
    expect(profile.supportEmail).toBe("support@example.com");
  });
});
