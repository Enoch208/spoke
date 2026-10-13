import { expect } from "vitest";
import type { Store } from "../src/db/store.js";
import type { createLiveClient } from "../../web/src/lib/client/live/index.js";

type Client = ReturnType<typeof createLiveClient>;

export const exerciseInvitations = async ({
  seller,
  earner,
  outsider,
  recipient,
  merchant,
  store,
  pause,
  resume,
}: {
  seller: Client;
  earner: Client;
  outsider: Client;
  recipient: string;
  merchant: string;
  store: Store;
  pause: () => Promise<unknown>;
  resume: () => Promise<unknown>;
}) => {
  const input = {
    distributor: recipient,
    campaignId: "1",
    message: "Join our campaign and share your confirmed link.",
    terms: "Untrusted client terms: guaranteed payment",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
  await expect(seller.call("invitations.send", input)).rejects.toMatchObject({
    code: "NOT_ELIGIBLE",
  });
  await expect(
    seller.call("invitations.send", { ...input, distributor: merchant }),
  ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  await earner.call("reputation.updateVisibility", { level: "private", acceptsInvitations: true });
  await expect(
    seller.call("invitations.send", { ...input, expiresAt: new Date(0).toISOString() }),
  ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  await expect(
    seller.call("invitations.send", {
      ...input,
      expiresAt: new Date(Date.now() + 91 * 86400000).toISOString(),
    }),
  ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  await pause();
  await expect(seller.call("invitations.send", input)).rejects.toMatchObject({
    code: "CAMPAIGN_NOT_ACTIVE",
  });
  await resume();
  const raced = await Promise.allSettled([
    seller.call("invitations.send", input),
    seller.call("invitations.send", input),
  ]);
  expect(raced.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(raced.filter((result) => result.status === "rejected")).toHaveLength(1);
  const pending = (await earner.call("invitations.mine", { status: "pending" })).items[0];
  if (!pending) throw new Error("Missing invitation after send");
  expect(pending.terms).not.toContain("guaranteed");
  expect(pending.terms).toContain("10%");
  expect(pending.terms).toContain("testnet");
  expect(pending.joinedNodeId).toBeNull();
  expect((await earner.call("invitations.get", { id: pending.id })).id).toBe(pending.id);
  for (const client of [seller, outsider]) {
    await expect(client.call("invitations.get", { id: pending.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      client.call("invitations.respond", { id: pending.id, response: "accept" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  }
  await outsider.call("merchants.setup", {
    name: "Other invitation merchant",
    slug: "other_invitation_merchant",
    supportEmail: "other@example.com",
    region: "NG",
    agreementVersion: "1.0",
  });
  await expect(outsider.call("invitations.withdraw", { id: pending.id })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(outsider.call("invitations.send", input)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect((await outsider.call("invitations.sent", {})).items).toEqual([]);
  expect((await seller.call("invitations.sent", { distributor: merchant })).items).toEqual([]);
  expect((await seller.call("invitations.sent", { distributor: recipient })).items).toHaveLength(1);
  const notifications = (await store.list("notification")).items;
  expect(
    notifications.filter((row) => row.payload.href === `/earn/invitations?id=${pending.id}`),
  ).toHaveLength(1);
  await seller.call("invitations.withdraw", { id: pending.id });
  expect((await seller.call("invitations.withdraw", { id: pending.id })).status).toBe("withdrawn");
  await expect(
    earner.call("invitations.respond", { id: pending.id, response: "accept" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const expiring = await seller.call("invitations.send", input);
  const stored = await store.require("invitation", expiring.id);
  await store.put("invitation", stored.id, stored.owner, {
    ...stored.payload,
    expiresAt: new Date(0).toISOString(),
  });
  expect(
    (await earner.call("invitations.mine", { status: "expired" })).items.map((item) => item.id),
  ).toEqual([expiring.id]);
  expect((await earner.call("invitations.get", { id: expiring.id })).status).toBe("expired");
  await expect(
    earner.call("invitations.respond", { id: expiring.id, response: "accept" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(seller.call("invitations.withdraw", { id: expiring.id })).rejects.toMatchObject({
    code: "CONFLICT",
  });
  const declined = await seller.call("invitations.send", input);
  await earner.call("invitations.respond", {
    id: declined.id,
    response: "decline",
    reason: "Not my audience",
  });
  expect(
    (await earner.call("invitations.respond", { id: declined.id, response: "decline" })).status,
  ).toBe("declined");
  await expect(
    earner.call("invitations.respond", { id: declined.id, response: "accept" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const accepted = await seller.call("invitations.send", input);
  await pause();
  await expect(
    earner.call("invitations.respond", { id: accepted.id, response: "accept" }),
  ).rejects.toMatchObject({ code: "CAMPAIGN_NOT_ACTIVE" });
  await resume();
  await earner.call("invitations.respond", { id: accepted.id, response: "accept" });
  await earner.call("invitations.respond", { id: accepted.id, response: "accept" });
  expect((await earner.call("invitations.get", { id: accepted.id })).joinedNodeId).toBeNull();
  expect((await earner.call("links.mine", {})).items).toEqual([]);
  expect(
    (await store.list("notification")).items.filter(
      (row) => row.payload.kind === "invitation.accepted",
    ),
  ).toHaveLength(1);
  await expect(seller.call("invitations.withdraw", { id: accepted.id })).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await expect(seller.call("invitations.send", input)).rejects.toMatchObject({ code: "CONFLICT" });
  const first = await earner.call("invitations.mine", { limit: 1 });
  expect(first.nextCursor).toBeTruthy();
  const second = await earner.call("invitations.mine", {
    limit: 1,
    cursor: first.nextCursor ?? "",
  });
  expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  expect((await earner.call("invitations.mine", { status: "pending" })).items).toEqual([]);
  return accepted.id;
};
