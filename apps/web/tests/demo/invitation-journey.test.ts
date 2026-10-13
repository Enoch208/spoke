import { describe, expect, it } from "vitest";
import { createDemoTestClient } from "./harness";
import { growthCoreInputs } from "./inputs-growth-core";

describe("merchant invitation journey", () => {
  it("sends, scopes the inbox, accepts, resumes and reports the confirmed link", async () => {
    const { client, runtime, chain } = createDemoTestClient({ persona: "merchant" });
    const recipient = runtime.world.people.find((person) => person.id === "demo-buyer-persona")
      ?.addresses[0];
    if (!recipient) throw new Error("Missing invitation recipient");
    const invitation = await client["invitations.send"]({
      ...growthCoreInputs["invitations.send"],
      distributor: recipient,
    });
    await expect(client["invitations.get"]({ id: invitation.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    runtime.setPersona("buyer");
    expect((await client["invitations.get"]({ id: invitation.id })).status).toBe("pending");
    await client["invitations.respond"]({ id: invitation.id, response: "accept" });
    await client["invitations.respond"]({ id: invitation.id, response: "accept" });
    expect((await client["invitations.get"]({ id: invitation.id })).joinedNodeId).toBeNull();
    runtime.setPersona("merchant");
    expect((await client["invitations.sent"]({ distributor: recipient })).items[0]).toMatchObject({
      status: "accepted",
      joinedNodeId: null,
    });
    runtime.setPersona("buyer");
    const result = chain.execute("createNode", {
      campaignId: invitation.campaignId,
      parentNodeId: "0",
    });
    expect((await client["invitations.get"]({ id: invitation.id })).joinedNodeId).toBe(
      result.objectId,
    );
    runtime.setPersona("merchant");
    expect(
      (await client["invitations.sent"]({ distributor: recipient })).items[0]?.joinedNodeId,
    ).toBe(result.objectId);
  });
});
