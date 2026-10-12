import { describe, expect, it } from "vitest";
import { shouldRetry } from "@/lib/client/errors";
import { ClientError } from "@/lib/client/errors";
import { keyForTarget, queryKey, staleTimeFor, staleTimes } from "@/lib/query/keys";

describe("query keys", () => {
  it("separates Live and Demo caches", () => {
    expect(queryKey("live", "campaigns.get", { campaignId: "7" })).toEqual([
      "live",
      "campaigns",
      "get",
      { campaignId: "7" },
    ]);
    expect(queryKey("demo", "campaigns.get", { campaignId: "demo-c-7" })[0]).toBe("demo");
  });

  it("invalidates a whole domain or one method", () => {
    expect(keyForTarget("live", "earnings")).toEqual(["live", "earnings"]);
    expect(keyForTarget("live", "vault.get")).toEqual(["live", "vault", "get"]);
  });

  it("refreshes money faster than profiles", () => {
    expect(staleTimeFor("earnings.claimable")).toBe(staleTimes.money);
    expect(staleTimeFor("campaigns.policy")).toBe(staleTimes.profile);
    expect(staleTimeFor("campaigns.list")).toBe(staleTimes.list);
  });
});

describe("retry policy", () => {
  it("retries transient failures twice and never a 4xx", () => {
    const transient = new ClientError({ code: "API_UNREACHABLE", message: "x" });
    const clientSide = new ClientError({ code: "NOT_FOUND", message: "x", status: 404 });
    expect(shouldRetry(0, transient)).toBe(true);
    expect(shouldRetry(2, transient)).toBe(false);
    expect(shouldRetry(0, clientSide)).toBe(false);
  });
});
