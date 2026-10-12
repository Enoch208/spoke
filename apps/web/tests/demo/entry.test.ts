import { clientMethodSchemas } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { createDemoClient, demoWorldCounts } from "../../src/lib/client/demo/index";
import { ANCHOR } from "./harness";

describe("the demo client entry point", () => {
  it("builds a client with every protocol method", () => {
    const { client } = createDemoClient({ clock: () => ANCHOR, persona: "merchant" });
    expect(Object.keys(clientMethodSchemas).every((method) => method in client)).toBe(true);
  });

  it("reports the world counts the demo page shows", () => {
    const { runtime } = createDemoClient({ clock: () => ANCHOR });
    expect(demoWorldCounts(runtime.world)).toEqual({ merchants: 6, distributors: 40, sales: 200 });
  });

  it("restores writes and simulated transactions from a saved snapshot", async () => {
    const first = createDemoClient({ clock: () => ANCHOR, persona: "merchant" });
    await first.client["campaigns.updateSettings"]({ campaignId: "demo-c-1", budgetAlertSales: 9 });
    first.chain.execute("pause", { campaignId: "demo-c-1" });
    const second = createDemoClient({
      clock: () => ANCHOR + 60_000,
      snapshot: first.runtime.snapshot(),
    });
    const campaign = await second.client["campaigns.get"]({ campaignId: "demo-c-1" });
    expect(campaign.state).toBe("PAUSED");
    expect(
      second.runtime.world.campaigns.find((entry) => entry.id === "demo-c-1")?.budgetAlertSales,
    ).toBe(9);
    expect(second.runtime.restore()).toBe("restored");
  });

  it("marks the index as syncing for a moment after a simulated transaction", () => {
    let now = ANCHOR;
    const { runtime, chain } = createDemoClient({ clock: () => now, persona: "merchant" });
    expect(runtime.indexingStatus()).toBe("live");
    chain.execute("pause", { campaignId: "demo-c-1" });
    expect(runtime.indexingStatus()).toBe("syncing");
    now += 16_000;
    expect(runtime.indexingStatus()).toBe("live");
  });
});
